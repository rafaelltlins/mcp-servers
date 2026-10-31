import { createRequire } from "node:module";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-template", version });

  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Return the given text. Replace this tool with your own.",
      inputSchema: { text: z.string().min(1) },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ text }) => ({ content: [{ type: "text", text }] }),
  );

  return server;
}
