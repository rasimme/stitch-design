<h1 align="center">Stitch Design</h1>

<p align="center">
  <strong>AI-powered UI design with Google Stitch — generate, iterate, export.</strong><br>
  An <a href="https://github.com/openclaw/openclaw">OpenClaw</a> skill wrapping the official <a href="https://www.npmjs.com/package/@google/stitch-sdk">@google/stitch-sdk</a>.
</p>

<p align="center">
  <a href="https://github.com/rasimme/stitch-design/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <a href="https://github.com/rasimme/stitch-design/blob/master/CHANGELOG.md"><img src="https://img.shields.io/badge/version-v1.0.3-blue.svg" alt="Version"></a>
  <a href="https://clawhub.com"><img src="https://img.shields.io/badge/ClawHub-skill-purple.svg" alt="ClawHub"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#workflows">Workflows</a> •
  <a href="#prompt-guide">Prompt Guide</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## What is this?

Your AI agent generates, iterates, and exports UI designs through Google Stitch — directly from chat. No browser tabs, no manual copy-paste. Describe what you want, get a screenshot back, refine with natural language.

> **"Design a minimal SaaS dashboard with sidebar nav, 4 KPI cards, and an area chart. Dark mode, desktop."**
>
> → Agent shapes the prompt → Stitch generates → screenshot delivered → "make it warmer" → done.

---

## Features

- **Text-to-UI** — Generate full screens or isolated components from text descriptions
- **Edit** — Targeted changes to existing screens ("change the header to blue")
- **Variants** — Explore 3–5 design directions with refine/explore/reimagine modes
- **Visual Review** — Browse project screens, get screenshots in chat, pick one to continue
- **Sketch-to-Design** — Upload a wireframe in Stitch Web UI, refine it via the skill
- **Auto-Export** — Every operation saves HTML + PNG locally
- **Prompt Shaping** — Built-in [prompt guide](references/prompt-guide.md) ensures the agent enriches your brief for better results
- **Recovery** — Handles Stitch API connection drops (2-5 min operations) automatically

---

## Quick Start

### Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed
- [Node.js](https://nodejs.org) ≥ 18
- A Google Stitch API key ([get one here](https://stitch.withgoogle.com) → Profile → API Keys)

### Install

**Via ClawHub (recommended):**

```bash
clawhub install stitch-design
```

**Manual:**

```bash
cd ~/.openclaw/skills
git clone https://github.com/rasimme/stitch-design.git
cd stitch-design/scripts && npm install
```

### Configure

Add your API key to OpenClaw config (`~/.openclaw/openclaw.json`):

```json5
{
  skills: {
    entries: {
      "stitch-design": {
        enabled: true,
        env: { STITCH_API_KEY: "your-key-here" }
      }
    }
  }
}
```

Or set it as an environment variable: `export STITCH_API_KEY=your-key-here`

---

## Commands

| Command | Description |
|---|---|
| `projects` | List all Stitch projects |
| `create "title"` | Create a new project |
| `info <project-id>` | Show project details and screens |
| `generate <project-id> "prompt"` | Generate a new screen (1-5 min) |
| `edit <screen-id> "prompt"` | Edit an existing screen |
| `variants <screen-id> "prompt"` | Generate design variants |
| `html <screen-id>` | Download screen HTML |
| `image <screen-id>` | Download screen screenshot |
| `export <screen-id>` | Download both HTML + screenshot |

### Flags

| Flag | Values | Default |
|---|---|---|
| `--device` | `desktop`, `mobile`, `tablet`, `agnostic` | SDK default (desktop) |
| `--model` | `pro` (Gemini 3.1 Pro), `flash` (Gemini 3.0 Flash) | SDK default (pro) |
| `--count` | `1`–`5` | `3` |
| `--range` | `refine`, `explore`, `reimagine` | `explore` |
| `--aspects` | `layout`, `color_scheme`, `images`, `text_font`, `text_content` | all |
| `--project` | project ID | from `latest-screen.json` |

---

## Workflows

### Generate → Review → Iterate

1. Tell the agent what you want ("a landing page for a coffee shop")
2. Agent shapes your prompt with design vocabulary and generates
3. You see the screenshot — say what to change
4. Agent edits or creates variants — repeat until satisfied
5. Export HTML or paste into Figma from the Stitch Web UI

### Sketch-to-Design

1. Upload your wireframe/sketch in [Stitch Web UI](https://stitch.withgoogle.com)
2. Tell the agent: "I uploaded a sketch — refine it with [your instructions]"
3. Agent finds the screen and applies edits

### Component Isolation

Ask for a specific component instead of a full page — the agent automatically adds isolation constraints so Stitch doesn't generate a full application layout.

---

## Prompt Guide

The skill includes a comprehensive [prompt guide](references/prompt-guide.md) covering:

- **4-Layer Framework** — Context → Structure → Aesthetic → Constraints
- **Aesthetic Vocabulary** — Which style words trigger which visual outputs
- **Patterns & Anti-Patterns** — What works well vs. what to avoid
- **Iteration Loop** — Anchor → Inject → Tune → Fix
- **Model Selection** — When to use Pro vs. Flash vs. Reimagine

The agent reads this guide automatically before generating prompts.

---

## Project Structure

```
stitch-design/
├── SKILL.md              # OpenClaw skill definition (loaded by agent)
├── scripts/
│   ├── stitch.mjs        # CLI wrapper — API calls & commands
│   ├── artifacts.mjs     # Local artifact storage & state
│   └── package.json      # @google/stitch-sdk dependency
├── references/
│   ├── prompt-guide.md   # Comprehensive prompting guide
│   └── sdk-api.md        # SDK API reference
├── runs/                  # Generated artifacts (gitignored)
├── LICENSE
├── CHANGELOG.md
└── README.md
```

---

## Models

| Model | Flag | Best for |
|---|---|---|
| Gemini 3.1 Pro | `--model pro` | Component generation, iterative refinement |
| Gemini 3.0 Flash | `--model flash` | Fast layout exploration, brainstorming |
| Reimagine | `--range reimagine` | Full visual overhauls |

---

## Known Limitations

- **No image upload via API** — Upload sketches/screenshots in Stitch Web UI first
- **~5 screens per project** — Stitch Web UI limit
- **Long operations** — Generation takes 1-5 minutes; connection drops handled automatically
- **Content hallucination** — Stitch may add unrequested UI elements; always review
- **Theming drift** — Brand colors can shift between sessions

---

## Contributing

This is a personal skill published for the OpenClaw community. Issues and PRs welcome.

---

## License

[MIT](LICENSE)
