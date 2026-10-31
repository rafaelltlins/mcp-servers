const DEFAULT_BASE_URL = "https://api.omniakey.com";
const MAX_MEDIA_BODY_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const CHAT_TIMEOUT_MS = 300_000;
const DOWNLOAD_TIMEOUT_MS = 300_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;

export type TaskStatus = "queued" | "processing" | "succeeded" | "failed" | "canceled";

export interface MediaAsset {
  asset_id?: string;
  kind?: string;
  mime_type?: string;
  byte_size?: number;
  sha256?: string;
  expires_at?: string;
  url: string;
}

export interface MediaTask {
  id: string;
  status: TaskStatus;
  assets?: MediaAsset[];
  [key: string]: unknown;
}

export interface CreateTaskRequest {
  model: string;
  type: "image" | "video" | "audio";
  operation: string;
  input: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface OmniaKeyClientOptions {
  apiKey?: string;
  baseUrl?: string;
  pollIntervalMs?: number;
}

export class OmniaKeyError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "OmniaKeyError";
  }
}

export function isTerminal(status: TaskStatus): boolean {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

/** Only HTTPS is allowed, except for loopback addresses used in local development. */
function assertSafeUrl(value: string): URL {
  const url = new URL(value);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new OmniaKeyError(`Refusing insecure URL: ${url.origin}`);
  }
  return url;
}

export class OmniaKeyClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly pollIntervalMs: number;

  constructor(options: OmniaKeyClientOptions = {}) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.baseUrl = assertSafeUrl(options.baseUrl?.trim() || DEFAULT_BASE_URL)
      .href.replace(/\/+$/, "")
      .replace(/\/v1$/, "");
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async listModels(): Promise<string[]> {
    const response = await this.request<{ data?: { id: string }[] }>("GET", "/v1/models");
    return (response.data ?? []).map((model) => model.id);
  }

  chat(body: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/v1/chat/completions", { body, timeoutMs: CHAT_TIMEOUT_MS });
  }

  createTask(task: CreateTaskRequest, idempotencyKey: string): Promise<MediaTask> {
    return this.request<MediaTask>("POST", "/v1/media/tasks", {
      body: task,
      headers: { "Idempotency-Key": idempotencyKey },
      maxBodyBytes: MAX_MEDIA_BODY_BYTES,
    });
  }

  getTask(taskId: string): Promise<MediaTask> {
    return this.request<MediaTask>("GET", `/v1/media/tasks/${encodeURIComponent(taskId)}`);
  }

  cancelTask(taskId: string): Promise<unknown> {
    return this.request("POST", `/v1/media/tasks/${encodeURIComponent(taskId)}/cancel`);
  }

  /** Polls until the task is finished or the time runs out. Never cancels the remote task. */
  async waitForTask(taskId: string, waitSeconds: number): Promise<MediaTask> {
    const deadline = Date.now() + waitSeconds * 1000;
    let task = await this.getTask(taskId);
    while (!isTerminal(task.status) && Date.now() + this.pollIntervalMs <= deadline) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      task = await this.getTask(taskId);
    }
    return task;
  }

  /** Asset URLs are already signed and may live on another host, so the API key is never sent. */
  async downloadAsset(url: string): Promise<Buffer> {
    const response = await fetch(assertSafeUrl(url), {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new OmniaKeyError(`Asset download failed with HTTP ${response.status}.`, response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      timeoutMs?: number;
      maxBodyBytes?: number;
    } = {},
  ): Promise<T> {
    if (!this.apiKey) {
      throw new OmniaKeyError("OMNIAKEY_API_KEY is not set. Create a key at https://omniakey.com/dashboard/tokens.");
    }

    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body && options.maxBodyBytes && Buffer.byteLength(body) > options.maxBodyBytes) {
      throw new OmniaKeyError(
        `Request body exceeds the ${options.maxBodyBytes} byte limit. Use a smaller file or a public URL.`,
      );
    }

    // Redirects are refused so the API key can never be forwarded to another host.
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      redirect: "error",
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...(body ? { body } : {}),
    });

    const text = await response.text();
    if (!response.ok) throw toApiError(response.status, text);

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new OmniaKeyError(`Expected JSON from ${path}, received: ${text.slice(0, 200)}`, response.status);
    }
  }
}

function toApiError(status: number, text: string): OmniaKeyError {
  let code: string | undefined;
  let message = text.slice(0, 500);
  try {
    const { error } = JSON.parse(text) as { error?: { code?: unknown; message?: unknown } | string };
    if (typeof error === "string") {
      message = error;
    } else if (error) {
      if (typeof error.code === "string") code = error.code;
      if (typeof error.message === "string") message = error.message;
    }
  } catch {
    // Not JSON: keep the truncated body as the message.
  }
  return new OmniaKeyError(`HTTP ${status}${code ? ` ${code}` : ""}: ${message}`, status, code);
}
