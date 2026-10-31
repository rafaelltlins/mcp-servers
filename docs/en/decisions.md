🇺🇸 English | 🇧🇷 [Português](../pt-BR/decisoes.md)

# Project decisions

These are the decisions behind this repository. If one changes, update this file in both languages.

| Topic | Decision |
| --- | --- |
| Repository | One monorepo, `mcp-servers`, with independent servers |
| Documentation | Separate files per language: English is the default, pt-BR has the same sections |
| Code language | English only, including comments |
| Default stack | TypeScript on Node.js, using the official MCP SDK |
| Versioning | Independent per server, managed with Changesets |
| Distribution | npm under the `@rafaelltlins` scope, listed in the official MCP Registry |
| License | MIT |

## Monorepo

All servers live in one repository because a single maintainer benefits from one place for issues, CI, conventions and templates.

Servers stay independent, so any of them can move to its own repository later with `git filter-repo` or `git subtree split`. Consider that when a server gets its own community, frequent releases or different contributors.

Independence means that each folder in `packages/` has its own dependencies, version, changelog, license and READMEs, and never imports from another package.

## Documentation in two languages

Each document exists as one file per language, because mixing both in one file makes it long and hard to read, review and search.

- `README.md` is in English, because GitHub and npm show it by default. `README.pt-BR.md` is the Portuguese version.
- Guides live in `docs/en/` and `docs/pt-BR/`.
- Every document links to its other language at the top.
- A change to one language must also update the other. The pull request template includes this check.

## Choice of language

MCP is a protocol, so a client doesn't know which language a server uses. The language only affects what users must install and how easy the server is to maintain.

TypeScript is the default because `npx` makes installation simple. A server may use another language when its work calls for it, such as Python for local data or AI processing. A single server shouldn't be written in two languages, because that doubles the maintenance without any gain for the client.

## Versioning

Each server follows [Semantic Versioning](https://semver.org/) on its own, using [Changesets](https://github.com/changesets/changesets). Each release gets a per-package Git tag, such as `@rafaelltlins/mcp-omniakey@0.1.0`, and each package has its own `CHANGELOG.md`.

This tag format replaces the `mcp-foo-v1.2.0` format first suggested, because it is what Changesets generates.

## Names and registries

| Place | Is the name unique? | Name format used |
| --- | --- | --- |
| npm, without a scope | Yes, across all of npm | Not used |
| npm, with a scope | Only within the scope, so authors can reuse names | `@rafaelltlins/mcp-<service>` |
| Official MCP Registry | Only within the namespace | `io.github.rafaelltlins/mcp-<service>` |

Using a scope means that every simple name, such as `mcp-omniakey`, stays available to this project even if someone else uses the same name elsewhere.

The [official MCP Registry](https://registry.modelcontextprotocol.io) was chosen because it is maintained by the MCP project itself. It stores only metadata, so the code is still published to npm. It was still in preview when this was written, so its rules may change.

## License

MIT allows any use, including customization and commercial use. It requires copies and substantial portions of the code to keep the copyright and license notice, which is how the original author stays credited.

It doesn't require forks to advertise the origin in any other way. A license with that kind of requirement would stop being "without restrictions".

## mcp-omniakey and the official OmniaKey server

OmniaKey publishes its own [official MCP server](https://github.com/omniakey-com/omniakey-devtools), also under MIT. This project is independent, is not affiliated with OmniaKey, and must always say that it is unofficial.

| | Official server | mcp-omniakey |
| --- | --- | --- |
| Installation | Pinned GitHub tag through `npx` | npm package |
| Media tools | One generic submit tool | One tool each for image, video and audio |
| Waiting and results | Separate wait tool; returns URLs | Optional wait when generating; downloads files to disk with checksum verification |
| Local files as input | Not offered as a tool feature | Local image, video and audio paths are accepted |

This comparison reflects the official server at v0.1.0 and should be reviewed as it evolves.

## Design rules for media tools

- **Long tasks:** a tool waits for at most 50 seconds, since many clients cancel calls at 60. After that it returns the task id, and the task keeps running.
- **Large files:** results return URLs or saved paths, never Base64, to protect the model's context.
- **API keys:** they are read only from environment variables and are never sent to the hosts that serve downloaded files.
- **Costs:** the description of every paid tool says so. Every paid media task uses an idempotency key, so a retry isn't charged twice.
- **Local files:** only known media extensions can be uploaded, so a malicious instruction can't send a file such as a private key.
- **Tool count:** tools are grouped by media type, with the model as a parameter, to keep the client's context small.
