# AI-Ready Design System Auditor

## What This Is

A production-grade DesignOps tool for Non-Enterprise Figma users that bridges Design Systems and AI-powered local IDEs. It consists of two components: a **Figma Plugin** that audits design systems and injects structured data into the file, and a **Local MCP Server** that exposes that data as tools (`get_design_tokens`, `get_component_specs`, `get_component_svg`, `get_audit_summary`) consumable by Trae, Cursor, and other MCP-compatible IDEs — all at zero cost.

Shipped v2.0 with a Figma-faithful UI rebuild, full architectural refactor, streaming MCP, SVG extraction, unpublished component detection, and corrected component naming and publish-status classification.

## Core Value

Any designer using a Non-Enterprise Figma account can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators when the system drifts, and give the AI full structured context about components, tokens, and audit issues — without paying for Figma Enterprise.

## Requirements

### Validated

- ✓ Monorepo scaffold with shared types, strict TypeScript, ESLint, Prettier — v1.0
- ✓ Dual-build Vite plugin (sandbox + single-file UI) with manifest — v1.0
- ✓ Four auditors: color, typography, spacing, disconnected components — v1.0
- ✓ Chunked setPluginData injection with documentchange debounce — v1.0
- ✓ Two-tab React UI: health dashboard + AI Context tab — v1.0
- ✓ MCP server: Figma REST client, chunk reconstruction, in-memory cache — v1.0
- ✓ Three MCP tools with Zod validation and shared types — v1.0
- ✓ Four CSS framework formatters: Tailwind, CSS Variables, CSS Modules, Styled Components — v1.0
- ✓ Structured error handling: 403, 429 backoff, corrupted chunks, schema mismatch — v1.0
- ✓ Plugin Community assets (128×128 icon, 1920×1080 cover) — v1.0
- ✓ Complete README setup guide (plugin + MCP + Cursor/Trae) — v1.0
- ✓ Zero `any` types, 22/22 tests, 62 kB bundle — v1.0
- ✓ Audit logic split into discrete, independently testable modules with stable typed contracts — v2.0 (ARCH-01–05)
- ✓ Plugin UI rebuilt pixel-faithful to Figma designs (Audit-1, Audit-2, Config-1) — v2.0 (UIS-01–04)
- ✓ Streaming active state with real-time progress indicator during audit — v2.0 (UIX-01)
- ✓ Unpublished/private component count visible in Audit results — v2.0 (UIX-02, UNPB-01–03)
- ✓ AI Context status (injected / outdated / missing) visible in Audit results — v2.0 (UIX-03)
- ✓ CSS framework selection, file key, connection status in Configuration — v2.0 (UIX-04)
- ✓ Export status and re-injection guidance in Configuration — v2.0 (UIX-05)
- ✓ MCP capability summary with new tools list in Configuration — v2.0 (UIX-06)
- ✓ All global UI states defined: empty, loading, success, warning, error, no SVG, not found — v2.0 (UIX-07)
- ✓ `get_component_specs` v2 with computed properties, per-state variants, source/origin metadata — v2.0 (SPEC-01–03)
- ✓ `get_component_svg` with serialized SVG, metadata, and descriptive error for non-extractable assets — v2.0 (SVG-01–03)
- ✓ `get_audit_summary` streaming with start/progress/chunk/end/error events + no-stream fallback — v2.0 (STRM-01–03)
- ✓ All UX copy, button states, sync errors, error messages, naming consistency corrected — v2.0 (FIX-01–06)
- ✓ publishStatus 2-state (published | private) — Figma Plugin API does not expose master on COMPONENT nodes — v2.0 (BUG-01)
- ✓ Component names use COMPONENT_SET parent name; `get_component_specs("Button")` finds correctly — v2.0 (BUG-02)

### Active (v3.0)

- [ ] Component lookup UI panel: look up computed specs by name in the plugin UI (CMLK-01)
- [ ] SVG asset browser: look up and preview SVG assets by name in the plugin UI (CMLK-02)
- [ ] fileKey auto-populated in MCP config snippet when audit report is available (UX improvement, low priority)

### Out of Scope

- Figma Enterprise features — non-Enterprise only, free tier focus
- Cloud/server-hosted MCP — local execution only
- Figma write-back (modify designs from MCP) — read-only
- Real-time WebSocket sync between plugin and MCP — pull-based cache model (MCP-ADV-01)
- Native mobile app — desktop IDEs only
- Figma REST API write endpoints — read-only
- Batch component lookup — deferred to v3 (MCP-ADV-02)

## Context

**v1.0 shipped 2026-03-05.** Built in 3 days across 5 phases, 15 plans, ~2,179 LOC TypeScript.
**v2.0 shipped 2026-03-19.** Built in 13 days across 8 phases (6–13), 21 plans, ~12,799 net LOC added.

- Tech stack: TypeScript strict, React, Vite (plugin) + Node.js, MCP SDK, Zod (server), Vitest (tests)
- Distribution: Figma Community (plugin) + local npm install (MCP server)
- Figma free API: 6 GET /v1/files requests/month — session cache is mandatory
- Plugin UI: ~209 kB (single-file HTML with inlined JS) — within Figma limits
- Tests: 178/178 green (Vitest, packages/plugin)
- Known tech debt: SchemaVersionError from MCP not propagated back to plugin UI (low severity, actionable via IDE message)
- Branch: `v2.0-development` — ready to merge to `master` after tagging

## Constraints

- **Figma API**: Free tier only — 6 GET requests/month, no write access
- **Figma Plugin**: setPluginData() per-key limit of 100kB — chunking threshold at 90kB
- **Auth**: Files must be "Anyone with link can view" for MCP Server to access via API
- **Tech Stack**: TypeScript strict mode, Vite for plugin bundling, Node.js for MCP server
- **Distribution**: Must pass Figma Community review criteria
- **UI Fidelity**: Figma design is source of truth — no free reinterpretation of layout or visual language
- **Git**: v2.0 developed on branch `v2.0-development`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite as plugin bundler | Modern, fast HMR, excellent TS support | ✓ Good — builds in <1s, 209 kB output |
| React for Plugin UI | Ecosystem maturity, component reuse | ✓ Good — clean two-tab UI |
| In-memory cache in MCP Server | Avoids rate limit exhaustion (6 req/month) | ✓ Good — single call per session |
| Multiple files in MCP Server | Multi-brand/multi-file use case | ✓ Good — FIGMA_FILE_KEYS env var |
| All 4 CSS frameworks in v1 | User confirmed all 4 required | ✓ Good — all formatters shipped |
| Chunking threshold at 90kB | Safety margin below 100kB hard limit | ✓ Good — no limit errors hit |
| CJS for MCP server | ESM resolution issues with shared package | ✓ Good — stable Node.js execution |
| `unknown` cast over `any` | Type-safe globalThis access, no eslint-disable | ✓ Good — zero any in codebase |
| icon field NOT in manifest.json | Figma rejects unknown manifest properties | ✓ Good — uploaded via publish UI |
| Tailwind formatter as v3 JS config | v4 @theme CSS syntax not widely supported yet | ✓ Good — works with Cursor/Trae |
| v2.0 UI from Figma source of truth | Ensures design intent is faithfully reproduced | ✓ Good — pixel-faithful UI shipped |
| MCP streaming for heavy operations | Prevents timeout and large payloads | ✓ Good — streaming + fallback both work |
| Branch `v2.0-development` | Isolate v2.0 work from stable v1.0 main | ✓ Good — clean separation maintained |
| AuditNode* interfaces in audit/inputs.ts | Auditors accept plain objects, not Figma nodes | ✓ Good — 178 tests possible in Vitest |
| schemaVersion bumped to '2.0.0' | Breaking change requires re-injection | ✓ Good — stale data caught with clear error |
| SVG stored in ai_svg_* keys | Separate from report chunks (ai_data_*) | ✓ Good — clean key namespacing |
| extractLayerTree() async recursive | Uses getVariableByIdAsync (deprecated sync removed) | ✓ Good — future-proof against Figma API changes |
| classifyPublishStatus 2-state (published\|private) | Figma Plugin API has no master property on COMPONENT | ✓ Good — BUG-01 eliminated at source |
| COMPONENT_SET name for component naming | Variant property strings unusable as lookup keys | ✓ Good — get_component_specs("Button") works |
| Per-page seenComponentSets Map for dedup | Scoped dedup prevents cross-page collision | ✓ Good — BUG-02 eliminated at source |

---
*Last updated: 2026-03-19 after v2.0 milestone*
