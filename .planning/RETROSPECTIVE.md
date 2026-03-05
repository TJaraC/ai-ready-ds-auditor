# Retrospective: AI-Ready Design System Auditor

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-05
**Phases:** 5 | **Plans:** 15 | **Duration:** 3 days (2026-03-02 → 2026-03-05)

### What Was Built

- Monorepo scaffold with shared types, strict TypeScript, ESLint, Prettier, Vitest
- Dual-build Vite plugin: sandbox (`code.js`) + single-file UI (`ui.html`, 62 kB gzip)
- Four audit engines: color hardcoding, typography hardcoding, spacing hardcoding, disconnected components
- Chunked `setPluginData` injection pipeline with `documentchange` debounce and Out of Sync indicator
- Two-tab React UI: health dashboard with click-to-navigate issues + AI Context tab with framework selector
- MCP server: Figma REST client with 429 backoff, chunk reconstruction, in-memory cache, multi-file support
- Three MCP tools with Zod validation: `get_design_tokens`, `get_component_specs`, `get_audit_summary`
- Four CSS framework formatters: Tailwind v3 config object, CSS Variables `:root`, CSS Modules `:export`, Styled Components theme
- Structured error handling for all Figma API failure modes
- Plugin Community assets: 128×128 icon + 1920×1080 cover (programmatic PNG via Node.js built-ins)
- Complete README setup guide covering plugin → token → file key → audit → MCP → IDE flow

### What Worked

- **GSD wave-based execution**: Plans 05-01 and 05-02 running in parallel saved meaningful time
- **Phased architecture**: Each phase left the system in a runnable state — no "integration hell" at the end
- **TDD for audit engine**: Pure function foundation (utils.ts) with Vitest tests caught bugs early (Phase 2)
- **Shared types as contract**: `packages/shared` exporting `AuditReport`, `DesignToken`, `ComponentSpec` kept plugin and server in sync without drift
- **Session cache design**: Figma's 6 req/month free tier limit made the single-call cache not just a perf optimization but a correctness requirement — the design held up perfectly
- **Smoke test as final gate**: Human-driven E2E test in 05-03 confirmed the full pipeline before shipping

### What Was Inefficient

- **REQUIREMENTS.md checkbox drift**: TOOL-04, TOOL-05, FMT-01..04 were implemented in Phase 4 but checkboxes never updated — discovered at milestone close. Worth automating or building into the executor agent prompts.
- **manifest.json icon field**: Plan assumed `"icon"` was a valid manifest field. A 30-second check of Figma docs would have caught this. Cost: one extra commit.
- **MCP server CJS pivot**: Discovered mid-Phase 4 that ESM resolution failed with the shared package. Required recompiling shared as CJS too. Added complexity not anticipated in planning.
- **Subagent Bash permissions**: The 05-03 executor agent stopped because it lacked Bash permissions — had to fall back to direct execution. GSD executor agents need Bash by default for this kind of task.

### Patterns Established

- `unknown` cast pattern for `globalThis` access: `(globalThis as unknown as { Prop?: Type }).Prop` — safer than `any`, no eslint-disable needed
- `exactOptionalPropertyTypes`: omit optional properties rather than assigning `undefined` explicitly
- Figma `VariableBindableNodeField` does not include `cornerRadius` — check individual corner fields instead
- Figma `strokeStyleId`/`fillStyleId` comparison: use `typeof id === 'string'` guard (unique symbol type)
- PNG generation with Node.js built-ins only (fs + zlib) — no external image libraries needed for simple assets
- Figma Community icon/cover: uploaded via publish UI, NOT via `manifest.json`
- MCP server logging: all via `process.stderr.write()` (ESLint bans `console.*` for stdio safety)
- Tailwind formatter: output v3 JS config object (not v4 `@theme` CSS syntax — not widely supported yet)

### Key Lessons

1. **Free tier API limits shape architecture** — the 6 req/month Figma limit wasn't in the initial plan; surfaced in Phase 4 research and changed caching from "nice to have" to "mandatory"
2. **Figma plugin manifest is strict** — any unknown field causes rejection at load time; validate against official schema before adding fields
3. **CJS vs ESM**: Node.js MCP servers should default to CJS to avoid module resolution edge cases with mixed package ecosystems
4. **Human checkpoints add real value** — the 03-03 and 05-03 human verification checkpoints caught real issues (manifest icon field, smoke test confirms full pipeline) that automated checks would have missed

### Cost Observations

- Model mix: Sonnet for implementation, Opus for planning agents
- Sessions: ~4 sessions over 3 days
- Notable: Wave 1 of Phase 5 (parallel 05-01 + 05-02) was the most efficient execution — two independent plans completing in ~8 minutes combined

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Duration | 3 days |
| Phases | 5 |
| Plans | 15 |
| LOC (TypeScript) | 2,179 |
| Test coverage | 22/22 (100%) |
| Bundle size | 62 kB gzip |
| Requirement completion | 56/62 (90% at close, 6 retroactively confirmed) |
