# mcp-servers

A monorepo of independent MCP servers. Full rationale: `docs/en/decisions.md`.

## Rules

- Source code, comments, identifiers, commit messages and tool descriptions are in English only.
- User-facing docs exist in English and pt-BR. Every change updates both, with matching sections.
- Each package in `packages/` is independent: no imports between packages, and its own dependencies, version, changelog, license and READMEs.
- New servers start from `templates/mcp-template`. See `docs/en/creating-a-new-mcp.md`.
- Every user-visible change to a package needs a changeset (`npm run changeset`).
- Never commit secrets. API keys come from environment variables and never appear in logs or errors.
- Over stdio, write diagnostics to stderr only.

## Commands

- `npm run check`: typecheck, build and test every package.
- `npm run changeset`: record a change for release.
- `npm run version`: apply changesets and sync each `server.json`.
- `npm run release`: run checks and publish changed packages to npm.
