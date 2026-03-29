# CLAUDE.md — Stitch Design

## Git Rules
- **NEVER** add `Co-Authored-By`, `Generated-By`, or any AI attribution to commits
- All commits are authored by the repo owner
- No AI tool references in commit messages

## Project Context
- OpenClaw skill wrapping Google Stitch AI for UI design
- CLI: `scripts/stitch.mjs` (Node.js, ESM)
- SDK: `@google/stitch-sdk` in `scripts/`
- State: `runs/`, `state/`, `latest-screen.json`

## Architecture
- `stitch.mjs` — Main CLI, all commands
- `download.mjs` — HTTP downloads, screenshot URL validation, PNG magic bytes
- `design-system.mjs` — Local file reader for `--design-system` flag
- `names.mjs` — Screen alias registry
- `events.mjs` — Append-only event log

## Testing
```bash
cd scripts && node --test tests/
```

## Publishing
- Always run `clawhub-lint` before `clawhub publish`
- Only publish on clean verdict
