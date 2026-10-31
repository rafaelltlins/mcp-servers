import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { expect, it } from "vitest";

import { createServer } from "../src/server.js";

it("echoes text", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);

  const result = await client.callTool({ name: "echo", arguments: { text: "hello" } });

  expect(result.content).toEqual([{ type: "text", text: "hello" }]);
  await client.close();
});
