#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { OmniaKeyClient } from "./client.js";
import { createServer } from "./server.js";

const client = new OmniaKeyClient({
  apiKey: process.env.OMNIAKEY_API_KEY,
  baseUrl: process.env.OMNIAKEY_BASE_URL,
});

const server = createServer(client, { outputDir: process.env.OMNIAKEY_OUTPUT_DIR });

// stdout carries the protocol, so diagnostics must only go to stderr.
server.connect(new StdioServerTransport()).catch((error: unknown) => {
  console.error("Failed to start mcp-omniakey:", error);
  process.exit(1);
});
