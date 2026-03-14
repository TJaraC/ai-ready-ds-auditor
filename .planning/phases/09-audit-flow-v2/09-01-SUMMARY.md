---
phase: 09-audit-flow-v2
plan: 01
subsystem: ui
tags: [typescript, react, state-management, shared-types]

# Dependency graph
requires:
  - phase: 08-ui-v2-base
    provides: AppState, appReducer, state.ts pattern established in Phase 7

provides:
  - ComponentSpec.publishStatus field typed 'published' | 'private' | 'local'
  - AuditReport.summary.unpublishedComponents: number
  - AppState.contextStatus: 'injected' | 'outdated' | 'missing' | null
  - AppState.unpublishedCount: number
  - Reducer cases: SET_CONTEXT_STATUS, updated INJECT_COMPLETE, SYNC_OUTDATED, SCAN_COMPLETE

affects:
  - 09-02 (components auditor — publishStatus detection logic)
  - 09-03 (AuditView UI — unpublishedCount badge, contextStatus banner)
  - 09-04 (MCP streaming — AuditReport.summary shape)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Interface-first plan ordering — type contracts established before implementation plans

key-files:
  created: []
  modified:
    - packages/shared/src/types.ts
    - packages/plugin/src/ui/state.ts
    - packages/mcp-server/src/adapter.test.ts
    - packages/plugin/src/ui/state.test.ts

key-decisions:
  - "TYPE-01: publishStatus is a required field (not optional) — all ComponentSpec construction must supply it"
  - "TYPE-02: contextStatus defaults to null (no banner shown until first audit completes)"
  - "TYPE-03: INJECT_COMPLETE sets contextStatus='injected'; SYNC_OUTDATED sets contextStatus='outdated' — status tracks injection lifecycle"
  - "TYPE-04: unpublishedCount populated from report.summary.unpublishedComponents in SCAN_COMPLETE — flows from shared types through reducer"

patterns-established:
  - "Pattern 1: shared/dist rebuilt after type changes — downstream packages type-check against compiled declarations, not source"
  - "Pattern 2: Required new fields in shared types trigger auto-fix updates to all test fixtures using those types"

requirements-completed: [UNPB-01, UNPB-02, UIX-03]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 9 Plan 01: Type Contracts Summary

**TypeScript type contracts for Phase 9: ComponentSpec.publishStatus, AuditReport.summary.unpublishedComponents, AppState.contextStatus + unpublishedCount, and reducer cases for injection lifecycle tracking**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-14T20:29:54Z
- **Completed:** 2026-03-14T20:34:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `publishStatus: 'published' | 'private' | 'local'` to `ComponentSpec` in shared types
- Added `unpublishedComponents: number` to `AuditReport.summary` in shared types
- Extended `AppState` with `contextStatus` and `unpublishedCount` fields + updated `initialState`
- Added `SET_CONTEXT_STATUS` action; updated `INJECT_COMPLETE`, `SYNC_OUTDATED`, `SCAN_COMPLETE` reducer cases
- All packages type-check clean; 115 plugin tests + 19 mcp-server tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend shared types with publishStatus and unpublishedComponents** - `46abd13` (feat)
2. **Task 2: Extend AppState with contextStatus and unpublishedCount, update reducer** - `5756468` (feat)

## Files Created/Modified

- `packages/shared/src/types.ts` — Added `publishStatus` to `ComponentSpec`; added `unpublishedComponents` to `AuditReport.summary`
- `packages/plugin/src/ui/state.ts` — Added `contextStatus` + `unpublishedCount` to `AppState` + `initialState`; added `SET_CONTEXT_STATUS` action; updated `INJECT_COMPLETE`, `SYNC_OUTDATED`, `SCAN_COMPLETE` reducer cases
- `packages/mcp-server/src/adapter.test.ts` — Updated test fixture to include new required fields (auto-fix)
- `packages/plugin/src/ui/state.test.ts` — Updated `mockReport.summary` fixture to include `unpublishedComponents` (auto-fix)

## Decisions Made

- TYPE-01: `publishStatus` made required (not optional) — downstream plans must supply it when constructing `ComponentSpec`
- TYPE-02: `contextStatus` defaults to `null` — null means no banner shown; only set after first inject or sync-outdated
- TYPE-03: `INJECT_COMPLETE` → `'injected'`; `SYNC_OUTDATED` → `'outdated'`; `RESET_ERROR`/`START_AUDIT` leave `contextStatus` unchanged (no reset on error)
- TYPE-04: `unpublishedCount` flows from `report.summary.unpublishedComponents` in `SCAN_COMPLETE` — single source of truth in shared types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed adapter.test.ts ComponentSpec fixture missing publishStatus**
- **Found during:** Task 1 (Extend shared types)
- **Issue:** `ComponentSpec` literal in `adapter.test.ts` was missing `publishStatus` after making it required; `makeReport()` summary missing `unpublishedComponents`
- **Fix:** Added `publishStatus: 'published'` to spec literal; added `unpublishedComponents: 0` to summary fixture
- **Files modified:** `packages/mcp-server/src/adapter.test.ts`
- **Verification:** `npx tsc --noEmit` in mcp-server passes; 19 tests pass
- **Committed in:** `46abd13` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed state.test.ts mockReport.summary missing unpublishedComponents**
- **Found during:** Task 1 (Extend shared types)
- **Issue:** `mockReport.summary` in `state.test.ts` was missing `unpublishedComponents` after adding it as required to `AuditReport.summary`
- **Fix:** Added `unpublishedComponents: 0` to `mockReport.summary`
- **Files modified:** `packages/plugin/src/ui/state.test.ts`
- **Verification:** `npx tsc --noEmit` in plugin passes; 115 tests pass
- **Committed in:** `46abd13` (Task 1 commit)

**3. [Rule 3 - Blocking] Rebuilt shared dist declarations before downstream type checks**
- **Found during:** Task 1 (Extend shared types)
- **Issue:** mcp-server and plugin packages type-checked against stale `packages/shared/dist/types.d.ts` (pre-built declarations didn't include new fields); errors were invisible until dist was rebuilt
- **Fix:** Ran `npx tsc` in `packages/shared` to emit fresh `.d.ts` files before running downstream type checks
- **Files modified:** `packages/shared/dist/types.d.ts` (not tracked by git — dist is gitignored)
- **Verification:** Both packages type-check clean against updated declarations
- **Committed in:** N/A (dist files are gitignored)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All auto-fixes required for type correctness. Discovered and corrected stale shared dist pattern — important for understanding type-check scope in this monorepo.

## Issues Encountered

- mcp-server and plugin packages type-checked against stale shared `dist/` declarations (not source) when using project references. This is a monorepo build system behavior: `tsc --noEmit` in dependent packages reads pre-built `.d.ts` files from referenced packages. Always rebuild shared before checking downstream type-checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Type contracts in place — Plans 02, 03, 04 can now implement against typed interfaces
- Plan 02 (components auditor): `ComponentSpec.publishStatus` field ready to populate from Figma API
- Plan 03 (AuditView UI): `AppState.contextStatus` and `unpublishedCount` ready to wire to StatusBanner and MetricCard badge
- Plan 04 (MCP streaming): `AuditReport.summary.unpublishedComponents` included in report shape

---
*Phase: 09-audit-flow-v2*
*Completed: 2026-03-14*

## Self-Check: PASSED

- packages/shared/src/types.ts — FOUND
- packages/plugin/src/ui/state.ts — FOUND
- 09-01-SUMMARY.md — FOUND
- Commit 46abd13 — FOUND
- Commit 5756468 — FOUND
- publishStatus in types.ts — FOUND
- unpublishedComponents in types.ts — FOUND
- contextStatus in state.ts — FOUND
- unpublishedCount in state.ts — FOUND
- SET_CONTEXT_STATUS in state.ts — FOUND
