#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

// stdout carries the protocol, so diagnostics must only go to stderr.
createServer()
  .connect(new StdioServerTransport())
  .catch((error: unknown) => {
    console.error("Failed to start mcp-template:", error);
    process.exit(1);
  });
