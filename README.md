<h1 align="center">Stitch Design</h1>

<p align="center">
  <strong>AI-powered UI design with Google Stitch — generate, iterate, track, export.</strong><br>
  An <a href="https://github.com/openclaw/openclaw">OpenClaw</a> skill wrapping the official <a href="https://www.npmjs.com/package/@google/stitch-sdk">@google/stitch-sdk</a>.
</p>

<p align="center">
  <a href="https://github.com/rasimme/stitch-design/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <a href="https://github.com/rasimme/stitch-design/blob/master/CHANGELOG.md"><img src="https://img.shields.io/badge/version-v1.2.0-blue.svg" alt="Version"></a>
  <a href="https://clawhub.com"><img src="https://img.shields.io/badge/ClawHub-skill-purple.svg" alt="ClawHub"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#screen-names">Screen Names</a> •
  <a href="#event-log">Event Log</a> •
  <a href="#workflows">Workflows</a> •
  <a href="#prompt-guide">Prompt Guide</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

## What is this?

Your AI agent generates, iterates, and exports UI designs through Google Stitch — directly from chat. No browser tabs, no manual copy-paste. Describe what you want, get a hi-res screenshot back, refine with natural language.

> **"Design a minimal SaaS dashboard with sidebar nav, 4 KPI cards, and an area chart. Dark mode, desktop."**
>
> → Agent shapes the prompt → Stitch generates → hi-res screenshot delivered → "make it warmer" → done.

**New in v1.2.0:** Design system injection via `--design-system <name>` from a local `design-systems/` registry, automatic device type inheritance for edit/variants, robust screenshot URL validation with auto-refresh, and delta-based recovery for connection drops.

---

## Features

- **Text-to-UI** — Generate full screens or isolated components from text descriptions
- **Edit** — Targeted changes to existing screens ("change the header to blue")
- **Variants** — Explore 3–5 design directions with refine/explore/reimagine modes
- **Screen Names** — Alias registry so you can refer to screens by name instead of IDs
- **Event Log** — Append-only history of every operation with parent/child lineage
- **Hi-Res Delivery** — Screenshots delivered at full design resolution (780px+) via Google CDN
- **Visual Review** — Browse project screens, get screenshots in chat, pick one to continue
- **Sketch-to-Design** — Upload a wireframe in Stitch Web UI, refine it via the skill
- **Auto-Export** — Every operation saves HTML + PNG locally
- **Prompt Shaping** — Built-in [prompt guide](references/prompt-guide.md) ensures the agent enriches your brief
- **Recovery** — Handles Stitch API connection drops (1-5 min operations) automatically with delta-based recovery
- **Design System Injection** — Append `design-systems/<name>.md` to any prompt via `--design-system <name>`
- **Device Inheritance** — Edit and variants automatically inherit the source screen's device type

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

### Design Operations

| Command | Description |
|---|---|
| `generate <project-id> "prompt"` | Generate a new screen (1-5 min) |
| `edit <screen-id> "prompt"` | Edit an existing screen |
| `variants <screen-id> "prompt"` | Generate design variants (3-5 directions) |

### Project & Screen Management

| Command | Description |
|---|---|
| `projects` | List all Stitch projects |
| `create "title"` | Create a new project |
| `info <project-id>` | Show project details and screens |
| `show <alias\|screen-id>` | Fetch live screen data + hi-res screenshot URL |

### Export

| Command | Description |
|---|---|
| `html <screen-id>` | Download screen HTML |
| `image <screen-id>` | Download screen screenshot |
| `export <screen-id>` | Download both HTML + screenshot |

### Screen Names

| Command | Description |
|---|---|
| `name <alias> <screen-id>` | Assign a name to a screen |
| `unname <alias>` | Remove a name |
| `rename <old> <new>` | Rename an alias |
| `resolve <alias>` | Show the screen ID for a name |
| `names` | List all named screens (`--verify` checks API) |

### History & Lineage

| Command | Description |
|---|---|
| `history <alias>` | Show all events for a named screen |
| `lineage <alias\|screen-id>` | Trace parent→child chain across edits/variants |
| `rebuild` | Reconstruct `names.json` from the event log |

### Flags

| Flag | Values | Default |
|---|---|---|
| `--device` | `desktop`, `mobile`, `tablet`, `agnostic` | `desktop` for generate; inherited for edit/variants |
| `--design-system` | design system name/slug | — (loads `design-systems/<name>.md`) |
| `--model` | `pro` (Gemini 3.1 Pro), `flash` (Gemini 3.0 Flash) | SDK default (pro) |
| `--count` | `1`–`5` | `3` |
| `--range` | `refine`, `explore`, `reimagine` | `explore` |
| `--aspects` | `layout`, `color_scheme`, `images`, `text_font`, `text_content` | all |
| `--project` | project ID | from `latest-screen.json` |
| `--name` | alias slug | — (assign name during generate/edit/variants) |
| `--force` | — | overwrite existing alias |

---

## Screen Names

Stitch screen IDs are 32-character hex strings — impossible to remember across sessions. Screen names solve this:

```bash
# Name a screen during generation
node scripts/stitch.mjs generate <project-id> "prompt" --name landing-page

# Or name an existing screen
node scripts/stitch.mjs name dashboard abc123def456...

# Use names everywhere
node scripts/stitch.mjs show landing-page
node scripts/stitch.mjs history dashboard
```

**Rules:**
- Slugs only: lowercase `a-z`, digits `0-9`, hyphens `-`
- One alias per screen, one screen per alias
- Use `--force` to reassign an alias to a different screen
- Names are stored per-project in `state/projects/<id>/names.json`
- Names can be rebuilt from the event log via `rebuild`

---

## Event Log

Every design operation is recorded in an append-only JSONL log (`state/projects/<id>/events.jsonl`). This gives you:

- **Full history** — When was each screen created, edited, or branched?
- **Lineage tracking** — Which screen was edited to produce which? Parent→child chains across edits and variants.
- **Alias audit trail** — When was a name assigned, renamed, or removed?
- **Crash safety** — Append-only means no data loss on interruption

```bash
# See what happened to a design
node scripts/stitch.mjs history landing-page

# Trace the evolution of a screen
node scripts/stitch.mjs lineage abc123def456...
```

### Architecture

The skill uses a 3-layer state model:

| Layer | Storage | Purpose |
|---|---|---|
| **Artifacts** | `runs/<timestamp>/` | Immutable per-operation receipts (result.json, HTML, thumbnail) |
| **Event Log** | `state/.../events.jsonl` | Chronological record of all operations (append-only) |
| **Alias Pointers** | `state/.../names.json` | Current named references (rebuildable from event log) |

The **Stitch API** remains the source of truth for live data (hi-res screenshots, HTML code). Local state tracks what you did, not what exists.

---

## Image Delivery

Screenshots are delivered at full design resolution — no manual file copying needed.

**How it works:**
1. After generate/edit/variants, run `show <alias|screen-id>`
2. Extract the `screenshotUrl` from the JSON output
3. Append `=w780` (or `=s1200`, `=w1560`) for hi-res — default is a tiny thumbnail
4. Send via `MEDIA:<url>` on its own line

**URL size suffixes:**

| Suffix | Result |
|---|---|
| `=w780` | Full design width (recommended for mobile screens) |
| `=s1200` | Max 1200px on longest side |
| `=w1560` | 2× width (no upscaling beyond actual size) |
| *(none)* | Thumbnail (~168px — don't use this) |

---

## Workflows

### Generate → Review → Iterate

1. Tell the agent what you want ("a landing page for a coffee shop")
2. Agent shapes your prompt with design vocabulary and generates with `--name`
3. You see the hi-res screenshot — say what to change
4. Agent edits or creates variants — repeat until satisfied
5. Export HTML or paste into Figma from the Stitch Web UI

### Multi-Concept Exploration

1. Generate concept A with `--name concept-a`
2. Generate concept B with `--name concept-b`
3. Compare side by side via `show concept-a`, `show concept-b`
4. Pick a winner, iterate from there
5. Use `history` to see the evolution of each concept

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
├── SKILL.md                 # OpenClaw skill definition (agent instructions)
├── README.md                # This file
├── CHANGELOG.md
├── LICENSE
├── scripts/
│   ├── stitch.mjs           # CLI — all commands
│   ├── artifacts.mjs        # Run directory & artifact management
│   ├── download.mjs         # HTTP download & screenshot URL validation
│   ├── design-system.mjs    # Design system registry + safe loader
│   ├── names.mjs            # Alias registry (per-project)
├── design-systems/          # Allowlisted local design system markdown files
│   ├── events.mjs           # Append-only event log
│   └── package.json         # @google/stitch-sdk dependency
├── references/
│   ├── prompt-guide.md      # Comprehensive prompting guide
│   └── sdk-api.md           # SDK API reference
├── tests/
│   ├── test-names.sh        # Alias registry tests (28 cases)
│   └── test-events.sh       # Event log tests (29 cases)
├── state/                   # Per-project state (gitignored)
│   └── projects/<id>/
│       ├── names.json       # Current alias→screenId map
│       └── events.jsonl     # Append-only operation log
└── runs/                    # Generated artifacts (gitignored)
    └── <timestamp>-<slug>/
        ├── result.json      # Full API response
        ├── screen.html      # Generated HTML
        └── screen.png       # Thumbnail (use API URL for hi-res)
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
- **Theming drift** — Brand colors can shift between sessions; describe all design tokens inline
- **No design system API link** — The SDK can create design systems but can't link them to generate/edit calls yet; use `--design-system <name>` with a markdown file stored under `design-systems/` as workaround
- **Thumbnail resolution** — Local `screen.png` is a thumbnail (~168px); use `show` + URL suffix for hi-res

---

## Contributing

This is a personal skill published for the OpenClaw community. Issues and PRs welcome.

---

## License

[MIT](LICENSE)
