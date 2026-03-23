# Stitch Design

AI-powered UI design with Google Stitch — generate, iterate, export.

## Setup

**Required:** `STITCH_API_KEY` env var.
Get one at: https://stitch.withgoogle.com → Profile → API Keys

```bash
# Install dependencies (one-time)
cd scripts && npm install
```

## Usage

The CLI is at `scripts/stitch.mjs`. All output is JSON on stdout.

```bash
node scripts/stitch.mjs <command> [args] [--flags]
```

---

## Workflow: New Design

Use when user wants to design something from scratch.

**Step 1 — Shape the prompt** (see `references/prompt-guide.md` for keywords)

Transform the user's brief into a richer prompt:
- Add layout terms (sidebar, card grid, hero section...)
- Add visual tone (minimal, dark mode, editorial...)
- Specify device explicitly

**Step 2 — Generate**

```bash
node scripts/stitch.mjs generate <project-id> "shaped prompt" --device desktop
```

Typical time: 1–5 minutes. The CLI downloads HTML + PNG automatically.

**Step 3 — Preview**

Show the user the screenshot: `runs/<latest>/screen.png`

**Step 4 — Iterate** (edit or variants)

---

## Workflow: Edit Design

Use when user wants targeted changes to an existing screen.

```bash
node scripts/stitch.mjs edit <screen-id> "change the header to blue, add a search bar"
# --project auto-detected from latest-screen.json
```

Focused edits work better than vague ones. Be specific: colors, layout, components.

---

## Workflow: Design Variants

Use when user wants to explore directions before committing.

```bash
# 3 variants, exploring freely
node scripts/stitch.mjs variants <screen-id> "make it feel more premium" --count 3 --range explore

# More conservative: refine only
node scripts/stitch.mjs variants <screen-id> "tighten the spacing" --count 2 --range refine

# Target specific aspects
node scripts/stitch.mjs variants <screen-id> "new color direction" --aspects color_scheme,text_font
```

**Creative ranges:**
- `refine` — small changes, stays close to original
- `explore` — moderate exploration (default)
- `reimagine` — radical redesign

**Aspects** (comma-separated): `layout`, `color_scheme`, `images`, `text_font`, `text_content`

---

## Workflow: Export

Download HTML + screenshot from an existing screen.

```bash
node scripts/stitch.mjs export <screen-id> --project <project-id>
# or just HTML:
node scripts/stitch.mjs html <screen-id>
# or just screenshot:
node scripts/stitch.mjs image <screen-id>
```

---

## Project Management

```bash
# List all projects
node scripts/stitch.mjs projects

# Create a new project
node scripts/stitch.mjs create "App Name"

# Show project screens
node scripts/stitch.mjs info <project-id>
```

---

## State Tracking

`latest-screen.json` (in skill root) tracks the last generated/edited screen.

- `edit`, `variants`, `html`, `image`, `export` auto-detect project from `latest-screen.json`
- Override with `--project <id>` when needed

---

## Artifacts

Every operation saves to `runs/<YYYYMMDD-HHmmss>-<operation>-<slug>/`:

| File | Content |
|---|---|
| `screen.html` | Full HTML/CSS/JS of the screen |
| `screen.png` | Screenshot (desktop/mobile) |
| `result.json` | Metadata (screenId, projectId, prompt, timestamps) |
| `variant-N.html/.png` | For variants commands |

---

## Core Rules

1. **Always shape prompts** — Enrich the user's brief with layout/tone keywords before calling generate
2. **Preview first** — Show `screen.png` to user before offering export
3. **Default values:** `--device desktop`, `--model pro` (default via SDK), `--count 3`, `--range explore`
4. **State awareness** — Check `latest-screen.json` before asking user for screen/project IDs
5. **Figma export** — Manual: open Stitch UI → "Copy to Figma" → paste in Figma. CLI can export HTML which also pastes into Figma

## Flags Reference

| Flag | Values | Default |
|---|---|---|
| `--device` | `desktop`, `mobile`, `tablet`, `agnostic` | SDK default |
| `--model` | `pro`, `flash` | SDK default |
| `--count` | `1`–`5` | `3` |
| `--range` | `refine`, `explore`, `reimagine` | `explore` |
| `--aspects` | `layout`, `color_scheme`, `images`, `text_font`, `text_content` | all |
| `--project` | project ID | from `latest-screen.json` |
