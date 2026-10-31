import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OmniaKeyClient, OmniaKeyError } from "../src/client.js";
import { createServer } from "../src/server.js";

const API_KEY = "test-key";
const ASSET = Buffer.from("fake image bytes");
const ASSET_SHA256 = createHash("sha256").update(ASSET).digest("hex");

interface RecordedRequest {
  method: string;
  url: string;
  headers: IncomingMessage["headers"];
  body: any;
}

describe("mcp-omniakey", () => {
  let api: Server;
  let baseUrl: string;
  let requests: RecordedRequest[];
  let pollsUntilDone: number;
  let sha256: string;
  let workDir: string;
  let mcp: Client;

  const connect = async (apiKey: string | undefined = API_KEY) => {
    const client = new OmniaKeyClient({ apiKey, baseUrl, pollIntervalMs: 1 });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer(client, { outputDir: workDir }).connect(serverTransport);
    mcp = new Client({ name: "test", version: "1.0.0" });
    await mcp.connect(clientTransport);
  };

  const call = async (name: string, args: Record<string, unknown>) => {
    const result = (await mcp.callTool({ name, arguments: args })) as {
      content: { text: string }[];
      isError?: boolean;
    };
    return { data: JSON.parse(result.content[0]!.text), isError: result.isError === true };
  };

  beforeEach(async () => {
    requests = [];
    pollsUntilDone = 1;
    sha256 = ASSET_SHA256;
    workDir = await mkdtemp(join(tmpdir(), "mcp-omniakey-"));

    api = createHttpServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const raw = Buffer.concat(chunks).toString();
      requests.push({ method: req.method!, url: req.url!, headers: req.headers, body: raw ? JSON.parse(raw) : undefined });

      const json = (status: number, data: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };

      if (req.url === "/asset") return void res.end(ASSET);
      if (req.headers.authorization !== `Bearer ${API_KEY}`) {
        return json(401, { error: { code: "unauthorized", message: "bad key" } });
      }
      if (req.url === "/v1/models") {
        return json(200, { data: [{ id: "claude-opus-5-5" }, { id: "gpt-image-2" }, { id: "gpt-5.5" }] });
      }
      if (req.url === "/v1/chat/completions") {
        return json(200, { choices: [{ message: { role: "assistant", content: "hello" } }] });
      }
      if (req.url === "/v1/media/tasks") {
        if (requests.filter((r) => r.url === "/v1/media/tasks").length > 0 && req.headers["idempotency-key"] === "conflict") {
          return json(409, { error: { code: "idempotency_key_reused", message: "different body" } });
        }
        return json(202, { accepted: true, id: "task_1", status: "queued" });
      }
      if (req.url === "/v1/media/tasks/task_1") {
        if (pollsUntilDone-- > 0) return json(200, { id: "task_1", status: "processing" });
        return json(200, {
          id: "task_1",
          status: "succeeded",
          assets: [
            { asset_id: "task_1_asset_0", mime_type: "image/png", sha256, url: `${baseUrl}/asset` },
          ],
        });
      }
      if (req.url === "/v1/media/tasks/task_failed") {
        return json(200, { id: "task_failed", status: "failed", error: { code: "provider_failed", message: "rejected" } });
      }
      if (req.url === "/v1/media/tasks/task_1/cancel") return json(200, { id: "task_1", status: "processing" });
      return json(404, { error: { code: "task_not_found", message: "unknown" } });
    });

    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await mcp?.close();
    await new Promise((resolve) => api.close(resolve));
    await rm(workDir, { recursive: true, force: true });
  });

  it("exposes the expected tools", async () => {
    await connect();
    const { tools } = await mcp.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "cancel_task",
      "chat",
      "download_task_assets",
      "generate_audio",
      "generate_image",
      "generate_video",
      "get_task",
      "list_models",
    ]);
  });

  it("exposes its title and icon to clients", async () => {
    await connect();
    const info = mcp.getServerVersion();
    expect(info?.title).toBe("OmniaKey (unofficial)");
    expect(info?.icons?.[0]?.src).toMatch(/^https:\/\/raw\.githubusercontent\.com\/.*icon\.png$/);
  });

  it("starts without a key and explains how to get one when a tool is called", async () => {
    await connect("");
    const { data, isError } = await call("list_models", {});
    expect(isError).toBe(true);
    expect(data.error).toContain("OMNIAKEY_API_KEY");
    expect(requests).toHaveLength(0);
  });

  it("filters models", async () => {
    await connect();
    const { data } = await call("list_models", { search: "GPT", limit: 1 });
    expect(data).toEqual({ total: 2, models: ["gpt-image-2"] });
  });

  it("always sends chat as non-streaming", async () => {
    await connect();
    const { data } = await call("chat", {
      model: "gpt-5.5",
      messages: [{ role: "user", content: "hi" }],
      parameters: { temperature: 0.2, stream: true },
    });
    expect(data.choices[0].message.content).toBe("hello");
    expect(requests[0]!.body).toMatchObject({ model: "gpt-5.5", temperature: 0.2, stream: false });
  });

  it("generates an image, waits for it and sends an idempotency key", async () => {
    await connect();
    const { data, isError } = await call("generate_image", {
      model: "gpt-image-2",
      prompt: "a boat",
      parameters: { size: "1024x1024" },
    });
    expect(isError).toBe(false);
    expect(data.status).toBe("succeeded");
    expect(data.next_step).toContain("download_task_assets");
    expect(requests[0]!.headers["idempotency-key"]).toBeTruthy();
    expect(requests[0]!.body).toEqual({
      model: "gpt-image-2",
      type: "image",
      operation: "generate",
      input: { prompt: "a boat" },
      parameters: { size: "1024x1024" },
    });
  });

  it("returns the running task when the wait ends, without canceling it", async () => {
    await connect();
    pollsUntilDone = 1000;
    const { data, isError } = await call("generate_video", {
      model: "wan3.0-video",
      prompt: "a boat",
      duration: 5,
      wait_seconds: 0,
    });
    expect(isError).toBe(false);
    expect(data.status).toBe("queued");
    expect(data.next_step).toContain("get_task");
    expect(requests.some((r) => r.url.endsWith("/cancel"))).toBe(false);
    expect(requests[0]!.body.parameters).toEqual({ duration: 5 });
    expect(requests[0]!.body.operation).toBe("text_to_video");
  });

  it("turns local images into data URIs and switches to edit", async () => {
    await connect();
    const source = join(workDir, "source.png");
    await writeFile(source, "png");
    await call("generate_image", { model: "gpt-image-2", prompt: "edit", images: [source], wait_seconds: 0 });
    expect(requests[0]!.body.operation).toBe("edit");
    expect(requests[0]!.body.input.images).toEqual([`data:image/png;base64,${Buffer.from("png").toString("base64")}`]);
  });

  it("refuses to upload local files that are not media", async () => {
    await connect();
    const secret = join(workDir, "id_rsa");
    await writeFile(secret, "secret");
    const { data, isError } = await call("generate_image", { model: "m", prompt: "p", images: [secret] });
    expect(isError).toBe(true);
    expect(data.error).toContain("Unsupported media file");
    expect(requests).toHaveLength(0);
  });

  it("rejects bodies over 1 MiB before calling the API", async () => {
    await connect();
    const big = join(workDir, "big.png");
    await writeFile(big, Buffer.alloc(1024 * 1024));
    const { data, isError } = await call("generate_image", { model: "m", prompt: "p", images: [big] });
    expect(isError).toBe(true);
    expect(data.error).toContain("limit");
    expect(requests).toHaveLength(0);
  });

  it("requires a prompt or lyrics for audio", async () => {
    await connect();
    const { isError } = await call("generate_audio", { model: "suno-v6" });
    expect(isError).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it("maps audio fields to the API shape", async () => {
    await connect();
    await call("generate_audio", {
      model: "suno-v6",
      lyrics: "la la",
      prompt: "pop",
      title: "Song",
      instrumental: false,
      wait_seconds: 0,
    });
    expect(requests[0]!.body).toMatchObject({
      type: "audio",
      operation: "generate",
      input: { prompt: "pop", lyrics: "la la" },
      parameters: { title: "Song", instrumental: false },
    });
  });

  it("returns the idempotency key when submission fails", async () => {
    await connect();
    const { data, isError } = await call("generate_image", {
      model: "m",
      prompt: "p",
      idempotency_key: "conflict",
    });
    expect(isError).toBe(true);
    expect(data.error).toContain("idempotency_key_reused");
    expect(data.idempotency_key).toBe("conflict");
  });

  it("flags failed tasks as errors", async () => {
    await connect();
    const { data, isError } = await call("get_task", { task_id: "task_failed" });
    expect(isError).toBe(true);
    expect(data.error.code).toBe("provider_failed");
  });

  it("downloads assets, verifies them and never sends the key to the asset host", async () => {
    await connect();
    pollsUntilDone = 0;
    const { data, isError } = await call("download_task_assets", { task_id: "task_1" });
    expect(isError).toBe(false);
    expect(data.files[0].path).toBe(join(workDir, "task_1_asset_0.png"));
    expect(await readFile(data.files[0].path)).toEqual(ASSET);
    expect(requests.find((r) => r.url === "/asset")!.headers.authorization).toBeUndefined();
  });

  it("does not save a file whose checksum does not match", async () => {
    await connect();
    pollsUntilDone = 0;
    sha256 = "0".repeat(64);
    const { data, isError } = await call("download_task_assets", { task_id: "task_1" });
    expect(isError).toBe(true);
    expect(data.error).toContain("Checksum mismatch");
    await expect(readFile(join(workDir, "task_1_asset_0.png"))).rejects.toThrow();
  });

  it("refuses to download a task that has not succeeded", async () => {
    await connect();
    pollsUntilDone = 1000;
    const { data, isError } = await call("download_task_assets", { task_id: "task_1" });
    expect(isError).toBe(true);
    expect(data.error).toContain("processing");
  });

  it("does not leak the API key in errors", async () => {
    const client = new OmniaKeyClient({ apiKey: "wrong-secret", baseUrl });
    const error = await client.listModels().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OmniaKeyError);
    expect((error as OmniaKeyError).message).not.toContain("wrong-secret");
    await connect();
  });

  it("refuses insecure base URLs", async () => {
    expect(() => new OmniaKeyClient({ apiKey: "k", baseUrl: "http://example.com" })).toThrow("insecure");
    await connect();
  });

  it("accepts a base URL that already ends in /v1", async () => {
    const client = new OmniaKeyClient({ apiKey: API_KEY, baseUrl: `${baseUrl}/v1/` });
    await expect(client.listModels()).resolves.toContain("gpt-5.5");
    await connect();
  });
});
