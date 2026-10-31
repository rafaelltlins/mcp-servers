import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { isTerminal, type CreateTaskRequest, type MediaTask, type OmniaKeyClient } from "./client.js";
import { resolveMediaSource, saveAsset } from "./files.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const DEFAULT_OUTPUT_DIR = "omniakey-output";
// Many MCP clients cancel a tool call after 60 seconds, so waiting stops before that.
const MAX_WAIT_SECONDS = 50;
const DEFAULT_WAIT_SECONDS = 45;

const COST_NOTICE = "PAID: charges the user's OmniaKey balance when the task is created; failed tasks are refunded.";

const shared = {
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Model-specific options, forwarded as-is. They differ per model: see https://docs.omniakey.com/en/media/overview"),
  idempotency_key: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Reuse the key from a failed attempt, with identical input, to retry without being charged twice."),
  wait_seconds: z
    .number()
    .int()
    .min(0)
    .max(MAX_WAIT_SECONDS)
    .default(DEFAULT_WAIT_SECONDS)
    .describe("How long to wait for the result before returning the unfinished task. Waiting never cancels it."),
};

const taskId = z.string().min(1).describe("Task id returned by a generate_* tool.");

export interface ServerOptions {
  outputDir?: string;
}

function ok(data: unknown, isError = false): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], ...(isError ? { isError } : {}) };
}

function fail(error: unknown, details?: Record<string, unknown>): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return ok({ error: message, ...details }, true);
}

function describeTask(task: MediaTask): CallToolResult {
  const next_step = !isTerminal(task.status)
    ? "Still running. Call get_task with this id later; do not submit it again."
    : task.status === "succeeded"
      ? "Call download_task_assets to save the files. Signed URLs last about an hour; the files last 24 hours."
      : undefined;
  return ok({ ...task, ...(next_step ? { next_step } : {}) }, task.status === "failed");
}

export function createServer(client: OmniaKeyClient, options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "mcp-omniakey", version });
  const outputDir = options.outputDir?.trim() || DEFAULT_OUTPUT_DIR;

  /** Submits a task. Once it exists, a polling failure must not lose its id. */
  async function submit(
    request: CreateTaskRequest,
    idempotencyKey: string | undefined,
    waitSeconds: number,
  ): Promise<CallToolResult> {
    const idempotency_key = idempotencyKey ?? randomUUID();

    let task: MediaTask;
    try {
      task = await client.createTask(request, idempotency_key);
    } catch (error) {
      return fail(error, {
        idempotency_key,
        retry_hint: "The task may exist. To retry safely, send identical input with this idempotency_key.",
      });
    }

    if (waitSeconds === 0 || isTerminal(task.status)) return describeTask(task);
    try {
      return describeTask(await client.waitForTask(task.id, waitSeconds));
    } catch {
      return describeTask(task);
    }
  }

  function guarded<Args>(handler: (args: Args) => Promise<CallToolResult>) {
    return async (args: Args): Promise<CallToolResult> => {
      try {
        return await handler(args);
      } catch (error) {
        return fail(error);
      }
    };
  }

  server.registerTool(
    "list_models",
    {
      title: "List models",
      description: "List the model ids available to this API key. Free. Prices: https://omniakey.com/pricing",
      inputSchema: {
        search: z.string().optional().describe("Case-insensitive filter, such as 'claude' or 'image'."),
        limit: z.number().int().min(1).max(500).default(100),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guarded(async ({ search, limit }) => {
      const needle = search?.toLowerCase();
      const models = (await client.listModels()).filter((id) => !needle || id.toLowerCase().includes(needle));
      return ok({ total: models.length, models: models.slice(0, limit) });
    }),
  );

  server.registerTool(
    "chat",
    {
      title: "Chat",
      description: "Run a non-streaming chat completion on any OmniaKey text model. PAID: billed per token.",
      inputSchema: {
        model: z.string().min(1).describe("Text model id, from list_models."),
        messages: z
          .array(
            z.object({
              role: z.enum(["system", "developer", "user", "assistant"]),
              content: z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]),
            }),
          )
          .min(1)
          .describe("Messages in the OpenAI Chat Completions format."),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Extra Chat Completions fields, such as temperature or max_tokens."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guarded(async ({ model, messages, parameters }) =>
      ok(await client.chat({ ...parameters, model, messages, stream: false })),
    ),
  );

  server.registerTool(
    "generate_image",
    {
      title: "Generate image",
      description: `Generate an image, or edit one by passing images. Usually takes 25-60 seconds. ${COST_NOTICE}`,
      inputSchema: {
        model: z.string().min(1).describe("Image model id, such as gpt-image-2.5-flare or gemini-3.1-flash-image."),
        prompt: z.string().min(1),
        images: z
          .array(z.string().min(1))
          .optional()
          .describe("Source images for an edit: local paths, data URIs or public URLs. The request is capped at 1 MiB."),
        ...shared,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guarded(async ({ model, prompt, images, parameters, idempotency_key, wait_seconds }) => {
      const sources = images?.length ? await Promise.all(images.map(resolveMediaSource)) : undefined;
      return submit(
        {
          model,
          type: "image",
          operation: sources ? "edit" : "generate",
          input: { prompt, ...(sources ? { images: sources } : {}) },
          ...(parameters ? { parameters } : {}),
        },
        idempotency_key,
        wait_seconds,
      );
    }),
  );

  server.registerTool(
    "generate_video",
    {
      title: "Generate video",
      description: `Generate a video clip. Takes from one to several minutes, so expect to call get_task afterwards. ${COST_NOTICE} Some models keep rendering and bill even if canceled.`,
      inputSchema: {
        model: z.string().min(1).describe("Video model id, such as wan3.0-video or kling-3.0."),
        prompt: z.string().min(1),
        duration: z.number().int().positive().describe("Length in seconds. The allowed window depends on the model and sets the price."),
        operation: z.enum(["text_to_video", "image_to_video", "reference_to_video"]).default("text_to_video"),
        resolution: z.string().optional().describe("Model-specific, such as 720P. It affects the price."),
        media: z
          .array(
            z.object({
              type: z.enum(["first_frame", "last_frame", "reference_image", "reference_video", "reference_audio"]),
              url: z.string().min(1).describe("Public URL, data URI or local path."),
            }),
          )
          .optional()
          .describe("Frames or references: first_frame for image_to_video, reference_* for reference_to_video."),
        ...shared,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guarded(async ({ model, prompt, duration, operation, resolution, media, parameters, idempotency_key, wait_seconds }) => {
      const resolvedMedia = media
        ? await Promise.all(media.map(async (item) => ({ type: item.type, url: await resolveMediaSource(item.url) })))
        : undefined;
      return submit(
        {
          model,
          type: "video",
          operation,
          input: { prompt, ...(resolvedMedia ? { media: resolvedMedia } : {}) },
          parameters: { ...parameters, duration, ...(resolution ? { resolution } : {}) },
        },
        idempotency_key,
        wait_seconds,
      );
    }),
  );

  server.registerTool(
    "generate_audio",
    {
      title: "Generate audio",
      description: `Generate one finished song from a description or from lyrics. Usually takes up to two minutes. ${COST_NOTICE}`,
      inputSchema: {
        model: z.string().min(1).describe("Audio model id, such as suno-v4.5 or suno-v6."),
        prompt: z.string().min(1).optional().describe("Song description, or the style when lyrics are provided."),
        lyrics: z.string().min(1).optional().describe("Your own lyrics. Providing them switches to custom lyrics mode."),
        title: z.string().optional(),
        instrumental: z.boolean().optional().describe("Set to true for a track without vocals."),
        ...shared,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guarded(async ({ model, prompt, lyrics, title, instrumental, parameters, idempotency_key, wait_seconds }) => {
      if (!prompt && !lyrics) return fail("Provide at least one of prompt or lyrics.");
      return submit(
        {
          model,
          type: "audio",
          operation: "generate",
          input: { ...(prompt ? { prompt } : {}), ...(lyrics ? { lyrics } : {}) },
          parameters: {
            ...parameters,
            ...(title ? { title } : {}),
            ...(instrumental === undefined ? {} : { instrumental }),
          },
        },
        idempotency_key,
        wait_seconds,
      );
    }),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Read a media task's status and result, optionally waiting for it to finish. Free. Tasks are kept for 24 hours.",
      inputSchema: {
        task_id: taskId,
        wait_seconds: z.number().int().min(0).max(MAX_WAIT_SECONDS).default(0),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    guarded(async ({ task_id, wait_seconds }) => describeTask(await client.waitForTask(task_id, wait_seconds))),
  );

  server.registerTool(
    "cancel_task",
    {
      title: "Cancel task",
      description: "Request cancellation of a media task. Best-effort: some models keep rendering, and the final status decides the charge.",
      inputSchema: { task_id: taskId },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    guarded(async ({ task_id }) => ok(await client.cancelTask(task_id))),
  );

  server.registerTool(
    "download_task_assets",
    {
      title: "Download task assets",
      description: "Save a succeeded task's files to disk, verify their checksums and return the paths. Free.",
      inputSchema: {
        task_id: taskId,
        output_dir: z.string().min(1).optional().describe(`Target folder. Defaults to OMNIAKEY_OUTPUT_DIR or ./${DEFAULT_OUTPUT_DIR}.`),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guarded(async ({ task_id, output_dir }) => {
      // Reading the task first also yields fresh signed URLs.
      const task = await client.getTask(task_id);
      if (task.status !== "succeeded") return fail(`Task ${task_id} is ${task.status}; only succeeded tasks have files.`);

      const assets = task.assets ?? [];
      const files = await Promise.all(
        assets.map((asset, index) => saveAsset(client, asset, `${task_id}_asset_${index}`, output_dir ?? outputDir)),
      );
      return ok({ task_id, files });
    }),
  );

  return server;
}
