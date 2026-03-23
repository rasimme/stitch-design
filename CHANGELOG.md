# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-03-23

### Fixed
- Input validation for `--count` flag (NaN guard, range 1-5)
- `slugify()` fallback to 'unnamed' on empty/special-char-only input
- Model/device default documentation aligned with SDK behavior
- State awareness rule made explicit (read `latest-screen.json` before asking)

### Added
- Root `package.json` for ClawHub publish compatibility
- `.clawhubignore` (excludes node_modules, runs, .env, latest-screen.json)
- `engines.node >= 18` in scripts/package.json
- `references/sdk-api.md` referenced in SKILL.md Core Rules

## [1.0.0] - 2026-03-23

### Added
- CLI wrapper (`scripts/stitch.mjs`) with 9 commands: `projects`, `create`, `info`, `generate`, `edit`, `variants`, `html`, `image`, `export`
- Comprehensive prompt guide (`references/prompt-guide.md`) — 4-layer framework, aesthetic vocabulary, patterns/anti-patterns, iteration loop
- SDK API reference (`references/sdk-api.md`)
- Automatic artifact saving to `runs/` with `latest-screen.json` state tracking
- Connection-drop recovery via polling for long-running operations (2-5 min)
- Support for Gemini 3.1 Pro and Gemini 3.0 Flash models
- Variant generation with refine/explore/reimagine creative ranges
- Aspect-targeted variants (layout, color scheme, images, fonts, text content)
- OpenClaw skill integration with YAML frontmatter and env gating
- SKILL.md with visual review, sketch-to-design, and component isolation workflows
