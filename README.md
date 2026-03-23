# Stitch Design

OpenClaw Skill for AI-powered UI design with [Google Stitch](https://stitch.withgoogle.com).

Generate, iterate, and export UI screens directly from your chat — powered by the official `@google/stitch-sdk`.

## Features

- 🎨 **Generate** — Create UI screens from text prompts
- ✏️ **Edit** — Refine existing screens with targeted changes
- 🔀 **Variants** — Explore multiple design directions (Refine/Explore/Reimagine)
- 📦 **Export** — Download HTML + Screenshots locally
- 💡 **Smart Prompts** — Agent auto-enhances your design briefs

## Requirements

- `STITCH_API_KEY` — Get one from [Stitch Settings](https://stitch.withgoogle.com) → Profile → API Keys
- Node.js 18+

## Install

```bash
clawhub install stitch-design
```

Or manually:
```bash
cd ~/.openclaw/skills/stitch-design/scripts && npm install
```

## Usage

This skill is designed for AI agents (OpenClaw, Claude Code, Codex, etc.).

The agent reads `SKILL.md` and uses the CLI wrapper at `scripts/stitch.mjs` to interact with Google Stitch.

## License

MIT
