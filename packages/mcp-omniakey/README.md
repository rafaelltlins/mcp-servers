🇺🇸 English | 🇧🇷 [Português](README.pt-BR.md)

# mcp-omniakey

An MCP server that lets AI assistants use [OmniaKey](https://omniakey.com): chat with text models and generate images, videos and songs.

> **Unofficial project:** it isn't affiliated with OmniaKey. OmniaKey has its own [official MCP server](https://github.com/omniakey-com/omniakey-devtools). This one adds a dedicated tool for each media type, local files as input, and verified downloads to disk.

## Requirements

- Node.js 20 or newer
- An [OmniaKey API key](https://omniakey.com/dashboard/tokens)

> **Costs:** chat and generation tools spend your OmniaKey balance. Set a spending cap on the key if you want to limit an assistant's usage.

## Installation

> **Status:** chat, media generation, task status and downloads have been tested against the live OmniaKey API. `cancel_task` and local files as input have only been tested against a simulated API. This server isn't on npm yet, so the `npx` commands below won't work until it is published. To try it now, clone this repository, run `npm install` and `npm run build`, and configure your client with `"command": "node"` and `"args": ["<repository path>/packages/mcp-omniakey/dist/index.js"]`.

**Claude Code**

```bash
claude mcp add --transport stdio --env OMNIAKEY_API_KEY=your-key omniakey -- npx -y @rafaelltlins/mcp-omniakey
```

**Claude Desktop, Cursor and other clients with a JSON configuration**

```json
{
  "mcpServers": {
    "omniakey": {
      "command": "npx",
      "args": ["-y", "@rafaelltlins/mcp-omniakey"],
      "env": {
        "OMNIAKEY_API_KEY": "your-key"
      }
    }
  }
}
```

On Windows, if the client can't start `npx`, use `"command": "cmd"` and add `"/c", "npx"` to the start of `args`.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `OMNIAKEY_API_KEY` | Yes | Your API key |
| `OMNIAKEY_OUTPUT_DIR` | No | Default download folder. Defaults to `./omniakey-output` |
| `OMNIAKEY_BASE_URL` | No | API address. Defaults to `https://api.omniakey.com` |

## Tools

| Tool | What it does | Cost |
| --- | --- | --- |
| `list_models` | Lists the models available to your key | Free |
| `chat` | Runs a chat completion on a text model | Paid |
| `generate_image` | Generates an image, or edits images you provide | Paid |
| `generate_video` | Generates a video from text, a frame or references | Paid |
| `generate_audio` | Generates a song from a description or lyrics | Paid |
| `get_task` | Checks a task's status and result | Free |
| `cancel_task` | Requests cancellation of a task | See below |
| `download_task_assets` | Saves a task's files and verifies their checksums | Free |

## Example requests

Ask your assistant things like:

- "List the OmniaKey image models."
- "Generate a 16:9 image of a paper boat with `gemini-3.1-flash-image` and save it."
- "Create a 5-second video from `./frame.png` with `wan3.0-video` at 720P."
- "Compose an upbeat acoustic folk song with `suno-v6`."

## How generation works

1. A `generate_*` tool creates the task and waits for up to 45 seconds by default.
2. If the task isn't finished, the tool returns its id and the task keeps running. Video often needs this.
3. `get_task` checks the task again.
4. `download_task_assets` saves the files. Tasks and their files are available for 24 hours.

## Things to know

- **Parameters depend on the model:** options such as `size` or `aspect_ratio` go in `parameters`. See the [OmniaKey media docs](https://docs.omniakey.com/en/media/overview).
- **Input size:** a media request is limited to 1 MiB, including inline files. Use a public URL for larger files when the model accepts one.
- **Local files:** only `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.mp4`, `.mov`, `.webm`, `.mp3`, `.wav` and `.m4a` can be sent.
- **Retries:** if creating a task fails, the error includes an `idempotency_key`. Retrying with it and identical input avoids a second charge.
- **Cancellation:** it is best-effort. Some models keep rendering, and the final status decides the charge.

## Development

From the repository root:

```bash
npm install
```

```bash
npm run check
```

## License

[MIT](LICENSE)
