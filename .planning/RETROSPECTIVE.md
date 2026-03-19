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

## Milestone: v2.0 — Figma-Faithful UI + Enhanced MCP

**Shipped:** 2026-03-19
**Phases:** 8 (Phases 6–13) | **Plans:** 21 | **Duration:** 13 days (2026-03-06 → 2026-03-19)

### What Was Built

- Full architectural refactor: 6 auditors + serialize + MCP adapter + UI state all separated into independently testable modules; 178 Vitest tests green
- Plugin UI rebuilt pixel-faithful to Figma designs (Audit-1, Audit-2, Config-1) with shared state management, design tokens, 6 atomic components, and all global UI states
- Streaming audit flow: real-time progress bar, unpublished/private component count, AI Context status (injected/outdated/missing), start/progress/chunk/end MCP events + no-stream fallback
- Configuration tab v2: CSS framework selector, file key display with copy, MCP capability summary with new tools list, re-injection guidance banners
- `get_component_specs` v2: computed visual properties (width, height, padding, borderRadius, colors), per-state variants, source/origin metadata for each property
- `get_component_svg`: serialized SVG + metadata for logos/marks/icons, clear error for non-extractable components; SVG stored in separate `ai_svg_*` key namespace
- Phase 12 hardening: all copy reviewed, button states corrected, error messages actionable, naming consistent across all packages
- Phase 13 critical fixes: classifyPublishStatus reduced to 2-state (published|private), component names use COMPONENT_SET parent name for correct MCP lookups

### What Worked

- **Architecture-first approach**: Phase 7 separation into testable modules paid off throughout — every subsequent phase could write targeted tests without Figma runtime
- **Phase 13 "escape hatch"**: Inserting an unplanned phase for critical bugs after QA discovery worked cleanly with the decimal phase numbering system
- **Figma source of truth discipline**: Keeping Figma designs as the single UI reference prevented scope creep and kept implementation decisions clear
- **schemaVersion bump strategy**: Bumping to '2.0.0' and surfacing a clear SchemaVersionError with actionable copy made the breaking schema change smooth for users
- **TDD pattern for pure functions**: AuditNode* interfaces enabled full Vitest coverage; `classifyPublishStatus` bug was caught immediately by updated tests
- **Per-page seenComponentSets Map**: Scoping deduplication per page prevented cross-page collision while still supporting multi-page design systems

### What Was Inefficient

- **Phase 8 window size regression**: Human verify (08-04) caught that 592px was too wide on screen — required post-build adjustment to 380px. A quick test render earlier would have caught this.
- **Figma CSS vars**: Discovered mid-Phase 8 that `var(--figma-color-*)` renders invisible in the plugin webview — hardcoded tokens were always needed but this wasn't anticipated in planning.
- **ConfigView MCP Status removed late**: A fake "MCP Status" indicator was removed in Phase 12 when it became clear there was no runtime signal to drive it. Should have been cut in Phase 10 planning.
- **Phase 13 was an unplanned emergency**: Two critical MCP bugs (wrong Figma API property, wrong component naming) were discovered after Phase 11 shipped. A heavier integration test in Phase 11 would have caught both.
- **Background subagent Bash permission loss**: Background agents occasionally lost Bash permissions and had to be respawned in foreground. Needs investigation or GSD config adjustment.

### Patterns Established

- `AuditNode*` interfaces in `inputs.ts`: auditors accept plain objects, not Figma types → pure Vitest coverage without mocking Figma
- `(globalThis as Record<string, unknown>).figma = { mixed: Symbol('figma.mixed') }` mock pattern for auditor tests
- `noUncheckedIndexedAccess` pattern: `arr[i]!` after `expect(arr).toHaveLength(n)` in tests
- Figma CSS vars invisible in plugin webview: always use hardcoded token constants, never `var(--figma-color-*)`
- SVG optional store pattern: `missing ai_svg_meta → return []` (no throw) vs report store which throws on missing meta
- classifyPublishStatus: Figma Plugin API has no `master` property on COMPONENT nodes — access `remote` boolean via `unknown` cast; return 2-state only
- COMPONENT_SET name pattern: `parentSet ? parentSet.name : comp.name` for human-readable component lookup keys
- schemaVersion bump on breaking type changes: forces re-injection with clear error, prevents silent schema drift

### Key Lessons

1. **Test at API boundaries early**: Both Phase 13 bugs stemmed from Figma Plugin API properties not matching TypeScript type assumptions (`master`, variant string names). A smoke test hitting real Figma data in Phase 11 would have caught both.
2. **"Only Figma knows" properties need runtime validation**: Properties accessed via `unknown` cast (remote, master, fileKey) should be validated against real Figma runtime output before building logic on them.
3. **Architecture phases pay for themselves**: The 4-plan Phase 7 refactor enabled 178 tests and eliminated entire classes of integration bugs. The upfront cost was worth 5× in later phases.
4. **Streaming MCP is additive**: The no-stream fallback made streaming purely additive — IDEs that don't support streaming still work. Design fallbacks before designing the happy path.

### Cost Observations

- Model mix: Opus for planning/architecture agents, Sonnet for implementation
- Sessions: ~8 sessions over 13 days
- Notable: Phase 7 (4 plans, architecture refactor) was the most complex single phase; Phase 13 (1 plan, 3 min execution) was the fastest resolution of the most impactful bugs

---

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 |
|--------|------|------|
| Duration | 3 days | 13 days |
| Phases | 5 | 8 |
| Plans | 15 | 21 |
| LOC (TypeScript, net added) | 2,179 | ~12,799 |
| Test coverage | 22/22 (100%) | 178/178 (100%) |
| Bundle size | 62 kB gzip | 209 kB (single-file HTML) |
| Requirement completion | 56/62 (90%) | 36/36 (100%) |
| Unplanned emergency phases | 0 | 1 (Phase 13) |
