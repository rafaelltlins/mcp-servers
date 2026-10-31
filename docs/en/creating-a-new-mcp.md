🇺🇸 English | 🇧🇷 [Português](../pt-BR/criando-um-novo-mcp.md)

# Creating a new MCP

1. Copy `templates/mcp-template` to `packages/mcp-<service>`.
2. Replace `mcp-template` with `mcp-<service>` in every file of the new folder, and replace the placeholder descriptions.
3. Run `npm install` at the repository root to link the new package.
4. Implement your tools in `src/server.ts` and test them in `test/server.test.ts`.
5. Fill in `README.md` and `README.pt-BR.md`.
6. Add the server to the tables in the root `README.md` and `README.pt-BR.md`.
7. Run `npm run check`.
8. Run `npm run changeset` to record the first release.

## Rules for every server

- Don't import from another package in this repository. Shared code would tie their releases together.
- Read secrets only from environment variables, and let the server start without them. Report a missing key when a tool is called.
- Write diagnostics to stderr, because stdout carries the MCP protocol.
- Say in the tool description when a tool costs money or changes something.
- Have tools that take a long time return a task id, instead of blocking past the client's time limit.
- Return URLs or file paths for large content, instead of the content itself.
