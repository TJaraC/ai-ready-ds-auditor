---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Figma-Faithful UI + Enhanced MCP
status: executing
stopped_at: Completed 11-03-PLAN.md
last_updated: "2026-03-18T08:30:05.143Z"
last_activity: 2026-03-18
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 18
  completed_plans: 18
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** Any Non-Enterprise Figma user can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators, and give the AI full structured context — for free.
**Current focus:** Milestone v2.0 — Phase 9 COMPLETE, executing Phase 10

## Current Position

**Phase:** 11 of 12 — MCP Component Tools
**Plan:** 3/4 plans complete
**Status:** In progress
**Last Activity:** 2026-03-18

Progress: [█████████░] 92%

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed: 15
- Average duration: ~20 min/plan
- Total execution time: ~5 hours

*v2.0 metrics will populate as plans complete*

| Phase-Plan | Duration | Tasks | Files |
| ---------- | -------- | ----- | ----- |
| 09-01 | 5min | 2 | 4 |
| Phase 09-audit-flow-v2 P09-02 | 5min | 1 tasks | 5 files |
| Phase 09 P03 | 3min | 1 tasks | 1 files |
| Phase 09-audit-flow-v2 P04 | 30min | 4 tasks | 6 files |
| Phase 10-configuration-flow-v2 P01 | 8min | 2 tasks | 4 files |
| Phase 10-configuration-flow-v2 P10-02 | 35min | 3 tasks | 4 files |
| Phase 11-mcp-component-tools P11-01 | 3min | 2 tasks | 9 files |
| Phase 11-mcp-component-tools P11-02 | 4min | 2 tasks | 6 files |
| Phase 11-mcp-component-tools P11-03 | 8min | 2 tasks | 5 files |

## Accumulated Context

### Decisions (carried from v1.0)

- Vite as plugin bundler — ✓ Good
- React for Plugin UI — ✓ Good
- In-memory cache in MCP Server — ✓ Good (6 req/month free tier)
- Chunking threshold at 90kB — ✓ Good
- CJS for MCP server (ESM resolution issues with shared) — ✓ Good
- `unknown` cast over `any` — ✓ Good
- icon field NOT in manifest.json — ✓ Good

### Decisions (from Phase 6 → implemented in Phase 7)

- ARCH-01: Auditors accept `AuditNode*` interfaces, not Figma nodes → `audit/inputs.ts` — DONE (07-01)
- ARCH-02: `serializeReport()` extracted to `serialize.ts` — pure, no Figma dep — DONE (07-02)
- ARCH-03: MCP adapter in `adapter.ts` — pure transforms, no MCP SDK imports — DONE (07-03); adapter wiring deferred to Phase 11
- ARCH-04: Chunk reader split into `assembleChunks()` + `parseReport()` — DONE (07-03); reconstructReport() is backward-compatible wrapper
- ARCH-05: UI state in `state.ts` + `useAppMessages.ts` — zero-React, zero-Figma — DONE (07-04)
- useReducer replaces 8 useState in App.tsx; message listener isolated in useAppMessages hook

### Key v1.0 Technical Notes

- TextEncoder via (globalThis as unknown as { TextEncoder?: ... })
- Chunk splitting by character count (81,000 chars), ai_data_meta written LAST
- setPluginData(key, '') is Figma deletion pattern
- figma.loadAllPagesAsync() required before documentchange handler
- optional catch binding (catch {}) rejected by Figma parser — use typeof guard
- cornerRadius figma.mixed skipped — future improvement
- pluginData accessed via fileResponse.document.pluginData ?? {}

### Decisions (from Phase 8 — executed 08-01)

- UI-TOKEN-01: 11 design token constants in `tokens.ts` — pure exports, no imports, no logic — components import named constants
- UI-TAB-01: Tab type `'audit' | 'config'` (was `'ai-context'`) — all references updated, tsc clean
- UI-WINDOW-01: Plugin window 592x600px set in `code.ts` `figma.showUI` — matches Figma frame exactly

### Decisions (from Phase 8 — executed 08-02)

- UI-COMP-01: `COLOR_SURFACE` (#FFFFFF) used for white text in Button/StatusBanner — avoids hardcoded '#FFFFFF', token-only rule
- UI-COMP-02: AccordionItem uses Unicode em-dash (\u2014) for "nodeName — offendingValue" format matching locked copy
- UI-COMP-03: Accordion defaults to `useState(true)` (open) — matches Figma Audit-2 design state

### Decisions (from Phase 8 — executed 08-03)

- UI-VIEW-01: AuditView props are state slices + handlers — no dispatch or postMessage inside view files
- UI-VIEW-02: Accordion list uses `margin: '0 11px'` wrapper (not SPACING_CONTENT) to achieve 570px accordion width in 592px frame
- UI-VIEW-03: Summary sentence 'We've detected 287 elements...' uses locked copy; dynamic substitution deferred to Phase 9
- UI-VIEW-04: ConfigView GitHub repo links use `href="#"` — URL confirmed in Phase 12

### Decisions (from Phase 8 — executed 08-04)

- UI-BUILD-01: Figma CSS vars (var(--figma-color-*)) replaced with hardcoded token constants — plugin renders predictably regardless of Figma theme mode
- UI-BUILD-02: Window width adjusted 592→380px after Figma visual check revealed 592px was too wide on screen
- UI-BUILD-03: App.tsx uses 100%/100vh, components use 100% widths — sandbox code.ts owns pixel dimensions via figma.ui.resize()
- UI-BUILD-04: Tabs active state: 2px bottom border COLOR_PRIMARY, no background fill — matches Figma design
- UI-BUILD-05: Accordion categories default to closed (open=false) — shows category labels without overwhelming results view
- UI-BUILD-06: Accordion accepts accent prop for 3px colored left border per category (color, typography, spacing, border, effects, components)
- UI-BUILD-07: ConfigView code block gets Copy button showing checkmark for 2s on click
- UI-BUILD-08: Issue count uses report.issues.length (real count) replacing hardcoded 287
- UI-BUILD-09: App.tsx root div uses borderRadius 0 0 20px 20px (bottom corners only)
- UI-BUILD-10: MetricCard uses flex:1 so two cards fit side by side

### Key v2.0 Technical Notes (Phase 7)

- Figma global mock for tests: `(globalThis as Record<string, unknown>).figma = { mixed: Symbol('figma.mixed') }` — before auditor imports
- noUncheckedIndexedAccess: use `arr[i]!` after `expect(arr).toHaveLength(n)` in tests
- auditTypography: guard `undefined` explicitly on optional fields before checking `!== figma.mixed`

### Key v2.0 Technical Notes (Phase 8)

- Figma CSS vars (var(--figma-color-text/bg)) render as invisible in plugin webview — always use hardcoded token constants
- Plugin window: sandbox code.ts sets pixel dimensions; UI uses 100%/100vh to fill the window
- Accordion category accent colors: color=#F55442, typography=#7B61FF, spacing=#1E9B6B, border=#F9A825, effects=#FF9500, component=#2B9FE0

### Decisions (from Phase 9 — executed 09-01)

- TYPE-01: `publishStatus` is required (not optional) in `ComponentSpec` — downstream construction must supply it
- TYPE-02: `contextStatus` defaults to `null` — null means no banner shown; only set after inject or sync-outdated
- TYPE-03: `INJECT_COMPLETE` → `contextStatus='injected'`; `SYNC_OUTDATED` → `contextStatus='outdated'`; error/start-audit leave contextStatus unchanged
- TYPE-04: `unpublishedCount` populated from `report.summary.unpublishedComponents` in `SCAN_COMPLETE` — single source in shared types

### Key v2.0 Technical Notes (Phase 9)

- Monorepo: mcp-server/plugin type-check against `packages/shared/dist/*.d.ts` (compiled declarations), not source — always rebuild shared after type changes before checking downstream
- `publishStatus` required field pattern: test fixtures that construct `ComponentSpec` must include it; update immediately when adding required fields to shared types

### Decisions (from Phase 9 — executed 09-02)

- IMPL-01: `classifyPublishStatus()` extracted as exported pure function in `components.ts` — testable without Figma runtime
- IMPL-02: `assembleReport()` new `unpublishedCount` parameter as 4th arg (between tokens and fileId) — all callers updated with 0
- IMPL-03: Figma `remote`/`master` accessed via `(comp as unknown as { remote: boolean; master: unknown })` cast in `index.ts`

### Key v2.0 Technical Notes (Phase 9 — continued)

- assembleReport() signature change: when adding new parameters, insert before fileId/fileName positional args — update all test callers immediately
- Figma COMPONENT node properties (remote, master) not in SceneNode TypeScript types — must cast via unknown to access at runtime

### Decisions (from Phase 9 — executed 09-03)

- STRM-TYPE-01: `RequestHandlerExtra<ServerRequest, ServerNotification>` required for typed `sendNotification` — `<never, never>` parameterization makes sendNotification expect `never`
- STRM-FALLBACK-01: Full `AuditSummaryResult` plain JSON return preserved as no-stream fallback (STRM-02)
- STRM-EMPTY-01: Empty categories produce no chunk event — `continue` if `catIssues.length === 0`
- STRM-ERR-01: Error notification in catch wrapped in inner try/catch — notification failure never masks the real `errorResponse`

### Key v2.0 Technical Notes (Phase 9 — MCP streaming)

- MCP streaming pattern: `start → loop(progress + chunk per non-empty category) → end → return full JSON fallback`
- Import `ServerRequest` + `ServerNotification` from `@modelcontextprotocol/sdk/types.js` for properly-typed `RequestHandlerExtra` in tool callbacks

### Decisions (from Phase 9 — executed 09-04)

- STARTUP-01: `CONTEXT_STATUS_CHECK` only sent when `getPluginDataKeys().length === 0` — `SYNC_OUTDATED` reserved for document change events, not startup; prevents false "outdated" banner on every plugin open
- BANNER-01: `contextStatus === null` renders no `StatusBanner` — banner only shown after explicit inject/outdated/missing signal; default state after audit that has not yet been injected
- BADGE-01: MetricCard `badge` prop is optional and undefined-gated — rendered only when `unpublishedCount > 0`; zero unpublished shows clean card
- EXPORT-01: `downloadJson` includes `tokenCounts.byType` (counts grouped by token type) alongside `tokenCounts.total` — richer IDE/MCP context for downstream consumers

### Key v2.0 Technical Notes (Phase 9 — UI wiring)

- Startup gate pattern: `figma.root.getPluginDataKeys().length === 0` → send `CONTEXT_STATUS_CHECK` with `status: 'missing'`
- `contextStatus` state machine: null (default) → missing (startup, no prior injection) → injected (INJECT_COMPLETE) → outdated (SYNC_OUTDATED on document change)
- AuditView props: `contextStatus` + `unpublishedCount` threaded from App.tsx state slices — no dispatch/postMessage inside view files (UI-VIEW-01 pattern)

### Decisions (from Phase 10 — executed 10-01)

- MSG-01: `FILE_KEY` SandboxMessage carries `fileKey: string | null` — covers undefined runtime value from `figma.fileKey`; null signals "key unavailable" without widening state to `undefined`
- STATE-01: `fileKey` initializes to `null` — consistent with `report`, `errorMessage`, `contextStatus` nullability conventions
- WIRE-01: `useAppMessages` wires `FILE_KEY → SET_FILE_KEY` immediately — Plan 10-02 only needs to add sandbox sender (`figma.fileKey` call + postMessage)

### Key v2.0 Technical Notes (Phase 10)

- New SandboxMessage variant always requires simultaneous useAppMessages case — TypeScript exhaustiveness check enforces this at compile time
- fileKey typed `string | null` (not `string | undefined`) — consistent with the AppState nullability convention

### Decisions (from Phase 10 — executed 10-02)

- CONFIG-01: MCP Status section always visible (only file key row conditional on fileKey !== null) — connection status is independent of file key availability; local files show status but no key
- CONFIG-02: FILE_KEY send unconditional at startup (null when figma.fileKey undefined for local files) — UI always knows availability state without a separate "no key" message
- CONFIG-03: Local fileKeyCopied state in ConfigView (not AppState) — transient 2s UI feedback does not belong in global reducer

### Key v2.0 Technical Notes (Phase 10 — ConfigView v2)

- MCP Status indicator (green dot + "Connected") always rendered in Config tab; file key row (truncated key + copy button) rendered only when fileKey !== null
- ConfigView receives cssFramework, onCssFrameworkChange, fileKey, contextStatus as props from App.tsx — UI-VIEW-01 pattern maintained
- figma.fileKey is string | undefined at runtime — always coerce to null with ?? before postMessage

### Decisions (from Phase 11 — executed 11-01)

- SCHEMA-01: schemaVersion bumped to '2.0.0' — ComponentSpec v2 required fields (layers/variants/states) are a breaking schema change; stale plugin data triggers SchemaVersionError forcing re-injection
- TYPE-05: ComponentSpec stub fields (variants:string[], props:string[], usageCount:number) replaced with v2 fields (layers:ComponentLayer[], variants:Record<string,string[]>, states:Record<string,LayerStateEntry>)
- TYPE-06: SvgRecord in shared/types.ts — both plugin (Plan 02) and mcp-server (Plan 03) import from same source
- TYPE-07: AuditNodeComponent extends AuditNode with symbol type for figma.mixed fields — consistent with existing AuditNodeBorder.cornerRadius pattern

### Key v2.0 Technical Notes (Phase 11 — type contracts)

- ComponentSpec.variants is now Record<string, string[]> (was string[]) — all callers construct with variants:{}, Plans 02+ populate with real data
- ComponentSpec.layers and ComponentSpec.states are required fields — audit/index.ts initializes to empty {}/{} until Plan 02 layer extraction is wired
- SVG store uses ai_svg_1/ai_svg_2... keys (SVG_CHUNK_KEY_PREFIX='ai_svg_') + ai_svg_meta key — separate from report chunks (ai_data_*)
- AuditNodeComponent interface placed in inputs.ts (not shared/types.ts) — consistent with all other AuditNode* interfaces

### Decisions (from Phase 11 — executed 11-02)

- EXTRACT-01: extractLayerTree is synchronous with optional resolvedVariables Map — async variable lookup deferred; fill sources default to 'hardcoded' until future pass pre-resolves variable IDs
- EXTRACT-02: VECTOR nodes have no children field in layer tree — SVG tool handles full vector content; structural decomposition stops at VECTOR boundary
- EXTRACT-03: cornerRadius symbol check uses typeof first, then optional mixedSymbol comparison — handles both Figma runtime and Node test environment
- SVG-INJECT-01: injectSvgs always called alongside injectReport on INJECT_DATA — both stores always written together on every injection

### Key v2.0 Technical Notes (Phase 11 — layer extraction)

- figma.mixed in pure functions: access via `(globalThis as unknown as { figma?: { mixed: symbol } }).figma?.mixed` — works in both real Figma runtime and Node/Vitest mock
- SVG export error pattern: catch block pushes SvgRecord with error field; never throws; every component always gets a record
- Pass 2 extraction flow: variants from parent COMPONENT_SET → layers from extractLayerTree → states from buildStatesMap if State/Interaction property found
- runAudit() return type is now `{ report: AuditReport; svgRecords: SvgRecord[] }` — code.ts destructures; all callers must update

### Decisions (from Phase 11 — executed 11-03)

- SVG-READER-01: `assembleSvgChunks` returns `[]` when `ai_svg_meta` missing — SVG store is optional (not all files have SVGs injected), unlike report store which throws
- SVG-READER-02: `_registeredTools` on `McpServer` is a plain object (not a Map) — test helper uses bracket notation `tools['tool_name']`
- SVG-CACHE-01: `svgs: SvgRecord[]` added to `CacheEntry` interface — empty array when no SVG store injected; populated by `assembleSvgChunks` in `ensureLoaded`

### Key v2.0 Technical Notes (Phase 11 — SVG reader)

- Optional store pattern: missing `ai_svg_meta` returns `[]` (no throw) — symmetric but behaviorally different from `assembleChunks` which throws on missing meta
- `SvgChunkError` mirrors `ChunkReconstructionError` with `fileKey` property for consistent error identification
- MCP tool test pattern: `(server as any)._registeredTools['tool_name'].handler` — plain object bracket access, not Map API

### Blockers/Concerns

None — Phase 9 complete (4/4 plans done). All Phase 9 UIX requirements met and human-verified.

### Pending Todos

None.

## Session Continuity

**Last session:** 2026-03-18T08:30:05.140Z
**Stopped at:** Completed 11-03-PLAN.md
**Next action:** Plan 11-04 (MCP server registration and server.ts wiring)
