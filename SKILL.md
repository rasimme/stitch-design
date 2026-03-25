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

## Screen Names (Alias Registry)

Screens get auto-generated IDs like `bcde81e368e24edbabd6213d9dc17b3b`. Use **screen names** to give them memorable aliases that persist across sessions.

### Naming screens

```bash
# Name during generation (recommended — naming in the flow)
node scripts/stitch.mjs generate <project-id> "prompt" --name concept-a

# Name during editing (alias follows the new screen)
node scripts/stitch.mjs edit <screen-id> "changes" --name concept-a --force

# Name an existing screen manually
node scripts/stitch.mjs name concept-a <screen-id> --project <id>

# Add a note
node scripts/stitch.mjs name concept-a <screen-id> --note "Karte als Fenster, Bottom Sheet"
```

### Looking up screens

```bash
# Show screen details via alias (fetches live data from Stitch API)
node scripts/stitch.mjs show concept-a

# Resolve alias to screen ID only
node scripts/stitch.mjs resolve concept-a

# List all named screens in a project
node scripts/stitch.mjs names

# List + verify against Stitch API (checks for deleted screens)
node scripts/stitch.mjs names --verify
```

### Managing names

```bash
# Rename
node scripts/stitch.mjs rename concept-a map-startscreen

# Remove
node scripts/stitch.mjs unname old-concept
```

### Naming rules
- **Slugs only:** lowercase `a-z`, `0-9`, hyphens. Case-insensitive.
- **Examples:** `concept-a`, `home-v2`, `onboarding-flow`, `dark-variant-3`
- **Not allowed:** spaces, uppercase, special characters
- Aliases are **unique per project** — the same alias can exist in different projects
- Use `--force` to overwrite an existing alias

### How it works
- Names are stored in `state/projects/<projectId>/names.json` (separate from runs/)
- The Stitch API remains the source of truth for screen data — names only store the alias→screenId mapping
- If a screen is deleted in Stitch, `show` will report it as broken; `names --verify` checks all at once
- Atomic writes (temp file + rename) prevent corruption from parallel access

### Agent workflow (MANDATORY)
When generating or editing screens for the user:
1. **Always use `--name`** when the user has a clear concept name or purpose for the screen
2. If the user refers to a screen by name (e.g. "show me Concept A"), use `show <alias>` first
3. When editing a named screen, use `--name <same-alias> --force` to keep the alias pointing to the latest version
4. Use `names` at session start to see what screens already exist

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
5. **Visual feedback (MANDATORY)** — After every generate/edit/variants, copy the PNG to the workspace and display it inline. See "Image Delivery" section below.
6. **Iteration > perfection** — Follow the Anchor → Inject → Tune → Fix loop. Define what must NOT change in every edit prompt.
7. **One prompt = one thing** — Never combine multiple components or screens in one prompt.
8. **Default values:** `--device` and `--model` use SDK defaults when omitted (typically desktop + Gemini Pro). Explicit: `--count 3`, `--range explore`.
9. **State awareness** — Before asking the user for screen or project IDs, ALWAYS read `latest-screen.json` first. If it has a recent entry, use that projectId/screenId. Only ask if no state exists or the user explicitly switches context.
10. **Figma export** — Manual: open Stitch UI → "Copy to Figma" → paste in Figma. CLI can export HTML which also pastes into Figma

---

## Image Delivery (MANDATORY after every generate/edit/variants)

Stitch saves PNGs to `runs/<timestamp>-<slug>/screen.png` — a path outside OpenClaw's allowed media directories. To show images in chat, always copy to the workspace first:

```bash
# After every generate/edit/variants — copy to workspace with a descriptive name
cp runs/<latest-run>/screen.png ~/.openclaw/workspace/<descriptive-name>.png
```

Then display inline in your reply using a **workspace-relative path**:
```
MEDIA:./descriptive-name.png
```

**Rules:**
- Use a meaningful filename (e.g. `concept-b-home-v2.png`, `concept-c-startscreen.png`)
- Always use `MEDIA:./filename.png` — NOT absolute paths (`MEDIA:/home/...` is blocked)
- For variants, copy each file: `variant-1.png`, `variant-2.png`, `variant-3.png`
- The workspace path is `~/.openclaw/workspace/` — relative paths resolve from there
- Clean up old preview PNGs periodically (they are for preview only; source of truth is `runs/`)

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
