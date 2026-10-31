🇺🇸 English | 🇧🇷 [Português](../pt-BR/primeiros-passos.md)

# Getting started

## Using a server

You don't need to clone this repository to use a server. Pick one from the [list](../../README.md#servers) and follow its README.

## Working on the code

You need Node.js 20 or newer.

```bash
git clone https://github.com/rafaelltlins/mcp-servers.git
```

```bash
cd mcp-servers
```

```bash
npm install
```

```bash
npm run check
```

`npm run check` typechecks, builds and tests every server.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/` | One folder per MCP server |
| `templates/mcp-template/` | Starting point for new servers |
| `docs/en/`, `docs/pt-BR/` | Guides for the whole repository |
| `scripts/` | Repository maintenance scripts |
| `.changeset/` | Pending version changes |
