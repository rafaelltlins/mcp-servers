🇺🇸 English | 🇧🇷 [Português](CONTRIBUTING.pt-BR.md)

# Contributing

## Setup

You need Node.js 20 or newer.

```bash
npm install
npm run check
```

## Rules

1. **Code in English:** source code, comments, identifiers and commit messages.
2. **Docs in both languages:** when you change a README or guide, update the English and pt-BR versions, keeping the same sections.
3. **Keep servers independent:** a package never imports from another package.
4. **Record your change:** run `npm run changeset` for any user-visible change to a package.
5. **Protect secrets:** never commit API keys or print them in logs and errors.

## Pull requests

Before opening a pull request, make sure `npm run check` passes.
