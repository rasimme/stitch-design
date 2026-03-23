---
name: stitch-design
description: AI-powered UI design with Google Stitch. Use when the user wants to generate UI screens, iterate on designs, create variants, or export HTML/screenshots. Handles text-to-UI generation, design editing, variant exploration (refine/explore/reimagine), project management, and visual review workflows. Requires STITCH_API_KEY.
metadata: {"openclaw": {"requires": {"env": ["STITCH_API_KEY"]}, "primaryEnv": "STITCH_API_KEY"}}
---

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

## Workflow: Visual Review (Browse & Pick)

Use when user wants to see existing designs and decide which to work on.

**Step 1 — Get project overview**

```bash
node scripts/stitch.mjs info <project-id>
```

This returns all screen IDs + titles.

**Step 2 — Export screenshots for each screen**

```bash
node scripts/stitch.mjs image <screen-id> --project <project-id>
```

Do this for each screen (or a selection). Each call saves a `screen.png`.

**Step 3 — Send images to user**

Send the screenshots via Telegram/Discord using the `message` tool with `media` pointing to the PNG files.
Include screen ID + title as caption so user can reference them.

**Step 4 — User picks a screen**

User says "take screen 3" or "the dark one" → match to screen ID.

**Step 5 — Continue with edit/variants**

Use the picked screen ID for `edit` or `variants` workflows.

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

1. **MANDATORY: Read `references/prompt-guide.md` before your first generate/edit/variants call in a session.** It contains critical prompting principles that determine output quality. For SDK details (methods, types, enums), see `references/sdk-api.md`.
2. **Always shape prompts** — Never pass the user's raw text directly to Stitch. Enrich it using the Prompt Framework (Context → Structure → Aesthetic → Constraints) from the prompt guide. Transform weak prompts into strong ones.
3. **Component isolation by default** — When the user asks for a component (not a full page), always add: "Design a single standalone UI component — do NOT generate a full application screen. Show it isolated on a neutral background."
4. **Preview first** — Show `screen.png` to user before offering export
5. **Visual feedback** — After generate/edit/variants, send the screenshot to the user via their chat channel (Telegram/Discord) so they can see the result immediately
6. **Iteration > perfection** — Follow the Anchor → Inject → Tune → Fix loop. Define what must NOT change in every edit prompt.
7. **One prompt = one thing** — Never combine multiple components or screens in one prompt.
8. **Default values:** `--device` and `--model` use SDK defaults when omitted (typically desktop + Gemini Pro). Explicit: `--count 3`, `--range explore`.
9. **State awareness** — Before asking the user for screen or project IDs, ALWAYS read `latest-screen.json` first. If it has a recent entry, use that projectId/screenId. Only ask if no state exists or the user explicitly switches context.
10. **Figma export** — Manual: open Stitch UI → "Copy to Figma" → paste in Figma. CLI can export HTML which also pastes into Figma

## Sketch-to-Design Workflow

Stitch interprets hand-drawn sketches and wireframes well. The SDK has no image upload — but the workflow is:
1. User uploads sketch in Stitch Web UI (stitch.withgoogle.com)
2. User tells the agent: "I uploaded a sketch called [title]" (or just "the sketch I just uploaded")
3. Agent runs `info <project-id>` → finds the screen by title in `list_screens`
4. Agent uses `edit` or `variants` on that screen to refine it

## Limitations

- **No image upload via SDK** — Sketches/screenshots must be uploaded in Stitch Web UI first, then refined via the skill
- **Models:** `pro` (Gemini 3.1 Pro) and `flash` (Gemini 3.0 Flash). "Redesign/NanoBanana" from the Web UI = `variants --range reimagine`
- **Full-screen bias** — Stitch defaults to generating complete layouts. Must be explicitly overridden for component work (see Core Rules).
- **Content hallucination** — Stitch adds unrequested copy, labels, badges. Always have the user review generated content.
- **Long operations** — generate/edit/variants take 1-5 minutes. Connection drops are handled automatically via recovery polling

## Flags Reference

| Flag | Values | Default |
|---|---|---|
| `--device` | `desktop`, `mobile`, `tablet`, `agnostic` | SDK default (desktop) |
| `--model` | `pro`, `flash` | SDK default (pro) |
| `--count` | `1`–`5` | `3` |
| `--range` | `refine`, `explore`, `reimagine` | `explore` |
| `--aspects` | `layout`, `color_scheme`, `images`, `text_font`, `text_content` | all |
| `--project` | project ID | from `latest-screen.json` |
