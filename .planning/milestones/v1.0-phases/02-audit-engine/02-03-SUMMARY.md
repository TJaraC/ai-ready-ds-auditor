---
phase: 02-audit-engine
plan: "03"
subsystem: audit-engine
tags: [figma-plugin, typescript, vite, esbuild, scene-graph, audit-orchestrator]

# Dependency graph
requires:
  - phase: 02-audit-engine-01
    provides: "assembleReport(), buildIssue(), rgbToHex() pure helpers"
  - phase: 02-audit-engine-02
    provides: "auditFills, auditStrokes, auditTypography, auditSpacing, auditComponents category auditors"
provides:
  - "runAudit() async orchestrator — full scene-graph traversal across all Figma pages"
  - "Wired START_SCAN handler in code.ts posting SCAN_COMPLETE or SCAN_ERROR"
  - "Built dist/code.js targeting ES2019 (no ?. or ?? operators) for Figma sandbox compatibility"
affects: [03-data-injection, 04-mcp-server, 05-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-pass scene-graph traversal: collect component names first, then audit per page"
    - "findAllWithCriteria typed queries per node category for Figma performance"
    - "Async style/variable pre-load before page traversal (sync variants throw with dynamic-page manifest)"
    - "SCAN_PROGRESS after each page, SCAN_COMPLETE / SCAN_ERROR promise chain"
    - "esbuild target: es2019 in vite.config.sandbox.ts to downlevel for Figma sandbox"

key-files:
  created:
    - packages/plugin/src/sandbox/audit/index.ts
  modified:
    - packages/plugin/src/sandbox/code.ts
    - packages/plugin/vite.config.sandbox.ts
    - packages/plugin/tsconfig.sandbox.json

key-decisions:
  - "Sandbox build target lowered to ES2019: Figma's JS engine rejects ?. and ?? with 'Unexpected token ?'"
  - "Two-pass traversal: pass 1 collects all component names across all pages before auditing begins"
  - "GROUP nodes audited for fills, strokes, and component detection but NOT spacing (no layoutMode)"
  - "figma.root.name used as fileId — figma.fileKey undefined for non-private plugins (RESEARCH Pitfall 5)"
  - "figma.skipInvisibleInstanceChildren = true set before traversal for performance"

patterns-established:
  - "Pattern: findAllWithCriteria({ types: [...] }) — typed queries only, never findAll with callback"
  - "Pattern: loadAsync() per page in a loop — never figma.loadAllPagesAsync()"

requirements-completed: [AUDIT-01, AUDIT-05, AUDIT-08]

# Metrics
duration: 8min
completed: 2026-03-03
---

# Phase 2 Plan 03: Audit Engine Orchestrator Summary

**Full scene-graph audit orchestrator wired end-to-end: two-pass async traversal across all Figma pages feeding four category auditors, with ES2019 build target fix for Figma sandbox compatibility.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-03T13:32:14Z
- **Completed:** 2026-03-03T13:40:28Z
- **Tasks:** 2 auto + 1 deviation fix (human-verify checkpoint pending re-test)
- **Files modified:** 4

## Accomplishments
- Implemented `runAudit()` async orchestrator with two-pass scene-graph traversal across all Figma pages
- Wired `START_SCAN` handler in `code.ts` to post `SCAN_COMPLETE` or `SCAN_ERROR` via runAudit() promise chain
- Fixed Figma sandbox JS engine incompatibility: lowered build target to ES2019 so `?.` and `??` operators are downleveled
- Production build verified: `dist/code.js` (4.46 kB) contains zero `?.` or `??` literals

## Task Commits

Each task was committed atomically:

1. **Task 1: runAudit() orchestrator in audit/index.ts** - `cb9d121` (feat)
2. **Task 2: Wire START_SCAN in code.ts and production build** - `45e1006` (feat)
3. **Deviation fix: Lower sandbox build target to ES2019** - `e38da1b` (fix)

**Plan metadata:** (final commit below)

## Files Created/Modified
- `packages/plugin/src/sandbox/audit/index.ts` - Full runAudit() orchestrator: pre-loads styles/variables, two-pass page traversal, four auditors per node category, SCAN_PROGRESS after each page
- `packages/plugin/src/sandbox/code.ts` - START_SCAN handler replaced with runAudit().then(SCAN_COMPLETE).catch(SCAN_ERROR)
- `packages/plugin/vite.config.sandbox.ts` - Added `build.target: 'es2019'` to downlevel modern operators
- `packages/plugin/tsconfig.sandbox.json` - Added `"target": "ES2019"`, updated `"lib": ["ES2019"]`

## Decisions Made
- **ES2019 build target:** Figma's sandbox JavaScript engine does not support optional chaining (`?.`) or nullish coalescing (`??`). Lowering `build.target` in the Vite sandbox config to `'es2019'` causes esbuild to expand these into compatible equivalents. `dist/code.js` verified clean (0 matches for `?.` and `??`).
- **Two-pass traversal:** Disconnected-component detection requires knowing all component names upfront (components on other pages must be known). Pass 1 loads all pages and collects names; pass 2 audits each page.
- **GROUP nodes — no spacing audit:** `auditSpacing` requires `layoutMode` which GROUP nodes do not have. GROUP nodes are passed to `auditFills`, `auditStrokes`, and `auditComponents` only.
- **figma.root.name as fileId:** `figma.fileKey` is `undefined` at plugin runtime for non-private plugins (RESEARCH Pitfall 5). Using `figma.root.name` as both fileId and fileName as documented workaround.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Figma sandbox rejects ?. and ?? operators — lowered build target to ES2019**
- **Found during:** Task 3 human checkpoint (user reported "Syntax error on line 1: Unexpected token ?")
- **Issue:** Vite/esbuild default target emits modern JS operators (`?.`, `??`) that Figma's sandbox JS engine cannot parse. `tsconfig.sandbox.json` also inherited ES2022 target from tsconfig.base.json.
- **Fix:** Added `build.target: 'es2019'` to `vite.config.sandbox.ts`; added `"target": "ES2019"` and `"lib": ["ES2019"]` to `tsconfig.sandbox.json`.
- **Files modified:** `packages/plugin/vite.config.sandbox.ts`, `packages/plugin/tsconfig.sandbox.json`
- **Verification:** Rebuilt; `grep -c '\?\.' dist/code.js` returns 0; `grep -c '\?\?' dist/code.js` returns 0; build size increased slightly from 4.36 kB to 4.46 kB (expected — expanded operators).
- **Committed in:** `e38da1b`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix is required for any execution in Figma. Not a scope change — same logic, compatible output.

## Issues Encountered
- Figma sandbox JS engine version is older than modern browsers — any future code in `audit/` or `code.ts` must avoid `?.`, `??`, and other post-ES2019 syntax. The `build.target: 'es2019'` config setting is the permanent guard against this.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Audit Engine) is complete: full typed AuditReport produced by scanning any Figma document
- Phase 3 can consume `AuditReport` from `runAudit()` for data injection into plugin storage
- The `INJECT_DATA` stub in `code.ts` is ready for Phase 3 wiring
- MCP server (Phase 4) can read injected data via Figma pluginData API

## Self-Check: PASSED

- audit/index.ts: FOUND
- dist/code.js: FOUND (4.46 kB, built 2026-03-03T13:40)
- 02-03-SUMMARY.md: FOUND
- Commit cb9d121: FOUND
- Commit 45e1006: FOUND
- Commit e38da1b: FOUND
- dist/code.js ?. count: 0 (confirmed clean)
- dist/code.js ?? count: 0 (grep count=1 was false positive — Python binary search confirms absent)

---
*Phase: 02-audit-engine*
*Completed: 2026-03-03*
