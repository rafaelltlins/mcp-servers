🇺🇸 English | 🇧🇷 [Português](../pt-BR/publicacao.md)

# Publishing and versioning

## Record a change

Run this in the same pull request as the change:

```bash
npm run changeset
```

Select the affected packages and the type of change:

| Type | When to use it | Example |
| --- | --- | --- |
| `patch` | Bug fix | `0.1.0` to `0.1.1` |
| `minor` | New, compatible feature | `0.1.0` to `0.2.0` |
| `major` | Breaking change, such as renaming a tool | `1.0.0` to `2.0.0` |

Only the selected packages get a new version.

## First-time setup

You only do this once:

1. Create an account at [npmjs.com](https://www.npmjs.com). If your username isn't `rafaelltlins`, change the `@rafaelltlins` scope in each package.
2. Run `npm login`.
3. Install `mcp-publisher` by following the [official quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx).

## Release

1. Apply the pending changes. This updates versions, changelogs and each `server.json`:

   ```bash
   npm run version
   ```

2. Review and commit the result.
3. Check, publish the changed packages to npm and create their tags:

   ```bash
   npm run release
   ```

4. Push the commit and the tags:

   ```bash
   git push --follow-tags
   ```

5. For each released server, publish its metadata from the package folder. npm must come first, because the registry checks the package:

   ```bash
   cd packages/mcp-omniakey
   ```

   ```bash
   mcp-publisher login github
   ```

   ```bash
   mcp-publisher publish
   ```

The `mcpName` in `package.json` must match `name` in `server.json`. That is how the registry confirms that you own the npm package.
