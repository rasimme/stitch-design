# Stitch Design

> OpenClaw Skill — AI UI design via [Google Stitch](https://stitch.withgoogle.com)

Generate, iterate, and export production-ready UI screens from your chat, powered by the official `@google/stitch-sdk`.

---

## Features

- 🎨 **Generate** — Create screens from text prompts (auto-downloads HTML + screenshot)
- ✏️ **Edit** — Make targeted changes to existing screens
- 🔀 **Variants** — Explore design directions (Refine / Explore / Reimagine)
- 📦 **Export** — Download HTML + screenshots locally
- 💡 **Prompt Guide** — Built-in reference for effective design prompts
- 🔄 **State Tracking** — Remembers last screen between sessions

## Requirements

- `STITCH_API_KEY` env var — Get one at [stitch.withgoogle.com](https://stitch.withgoogle.com) → Profile → API Keys
- Node.js 18+

## Install

```bash
clawhub install stitch-design
cd ~/.openclaw/skills/stitch-design/scripts && npm install
```

## Usage

This skill is designed for AI agents. The agent reads `SKILL.md` for workflows, uses `scripts/stitch.mjs` to interact with the API, and saves artifacts to `runs/`.

### Direct CLI

```bash
# List your projects
node scripts/stitch.mjs projects

# Create a project + generate a screen
node scripts/stitch.mjs create "My App"
node scripts/stitch.mjs generate <project-id> "A minimal dark SaaS dashboard with sidebar and metric cards" --device desktop

# Edit the last generated screen
node scripts/stitch.mjs edit <screen-id> "Switch to light mode with blue accents"

# Generate 3 variants to explore directions
node scripts/stitch.mjs variants <screen-id> "Make it feel more premium" --count 3 --range explore

# Export HTML + screenshot
node scripts/stitch.mjs export <screen-id>
```

### Flags

| Flag | Values | Default |
|---|---|---|
| `--device` | `desktop` `mobile` `tablet` | SDK default |
| `--model` | `pro` `flash` | SDK default |
| `--count` | `1`–`5` | `3` |
| `--range` | `refine` `explore` `reimagine` | `explore` |
| `--aspects` | `layout,color_scheme,images,text_font,text_content` | all |
| `--project` | project ID | auto from `latest-screen.json` |

## Artifacts

Every operation creates a timestamped folder in `runs/`:

```
runs/
  20260323-093158-generate-dark-dashboard/
    screen.html          # Full HTML/CSS (ready to open in browser)
    screen.png           # Screenshot
    result.json          # Metadata (screenId, projectId, prompt)
```

## Figma Integration

Manual: In the Stitch web UI, click **"Copy to Figma"** → paste in Figma. Yields editable Auto Layout components.

## How It Works

The CLI wraps the official `@google/stitch-sdk` using raw MCP tool calls (`stitch.callTool()`). The SDK connects to `stitch.googleapis.com/mcp` via the `@modelcontextprotocol/sdk` transport. Auth is injected via `X-Goog-Api-Key` header.

## License

MIT
