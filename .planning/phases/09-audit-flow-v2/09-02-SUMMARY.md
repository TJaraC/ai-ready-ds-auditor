---
phase: 09-audit-flow-v2
plan: 02
subsystem: audit
tags: [typescript, figma, vitest, tdd, component-audit]

# Dependency graph
requires:
  - phase: 09-audit-flow-v2/09-01
    provides: ComponentSpec.publishStatus field typed in shared/types.ts; AuditReport.summary.unpublishedComponents: number

provides:
  - classifyPublishStatus() exported from components.ts — pure helper classifying remote/master → published/private/local
  - assembleReport() updated signature with unpublishedCount parameter; summary.unpublishedComponents populated
  - index.ts Pass 2 sets publishStatus on each ComponentSpec and accumulates unpublishedCount
  - 4 new classifyPublishStatus tests + 2 new assembleReport tests (121 total)

affects:
  - 09-03 (AuditView UI — unpublishedCount now populated in report flowing to state)
  - 09-04 (MCP streaming — AuditReport.summary.unpublishedComponents now set at audit time)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED-GREEN: new tests written first (fail), then implementation added (pass)
    - Pure helper exported for testability — classifyPublishStatus() isolated from Figma runtime dependencies

key-files:
  created: []
  modified:
    - packages/plugin/src/sandbox/audit/components.ts
    - packages/plugin/src/sandbox/audit/components.test.ts
    - packages/plugin/src/sandbox/audit/utils.ts
    - packages/plugin/src/sandbox/audit/utils.test.ts
    - packages/plugin/src/sandbox/audit/index.ts

key-decisions:
  - "IMPL-01: classifyPublishStatus() extracted as exported pure function — enables direct unit testing without Figma runtime"
  - "IMPL-02: assembleReport() new 6th parameter is unpublishedCount (between tokens and fileId) — all existing callers updated with 0"
  - "IMPL-03: index.ts casts comp to { remote: boolean; master: unknown } — avoids TypeScript error while accessing Figma-specific properties at runtime"

patterns-established:
  - "Pattern: Figma-runtime properties accessed via (comp as unknown as { prop: T }).prop — keeps TypeScript strict while bridging Figma API"
  - "Pattern: New required parameters added to assembleReport — all test callers updated immediately as Rule 1 auto-fix"

requirements-completed: [UNPB-01, UNPB-02]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 9 Plan 02: Unpublished Component Detection Summary

**`classifyPublishStatus()` in components.ts detects published/private/local Figma components; assembleReport now populates `summary.unpublishedComponents` from accumulated count in index.ts Pass 2**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-14T20:37:55Z
- **Completed:** 2026-03-14T20:39:30Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Added `classifyPublishStatus(remote, master)` pure helper exported from `components.ts` — classifies Figma component publish state
- Updated `assembleReport()` signature with `unpublishedCount: number` parameter and sets `summary.unpublishedComponents`
- Updated `index.ts` Pass 2 COMPONENT loop to derive and set `publishStatus` on each `ComponentSpec`, accumulate `unpublishedCount`, pass to `assembleReport`
- 6 new tests added: 4 for `classifyPublishStatus` (all 3 branches), 2 for `assembleReport.unpublishedComponents`
- All 121 tests pass (was 115); tsc clean in both plugin and shared packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Add publishStatus classification and unpublishedComponents to audit** - `e2ad7ca` (feat)

## Files Created/Modified

- `packages/plugin/src/sandbox/audit/components.ts` — Added `classifyPublishStatus()` exported pure helper above `auditComponents`
- `packages/plugin/src/sandbox/audit/components.test.ts` — Added import of `classifyPublishStatus`; added 4-test `describe('classifyPublishStatus')` block
- `packages/plugin/src/sandbox/audit/utils.ts` — `assembleReport()` signature now takes `unpublishedCount: number` as 4th param; `summary.unpublishedComponents` set in returned report
- `packages/plugin/src/sandbox/audit/utils.test.ts` — Updated all `assembleReport` calls to 6-arg form with `0` for `unpublishedCount`; added `publishStatus` to `ComponentSpec` fixture; added 2 new `unpublishedComponents` tests
- `packages/plugin/src/sandbox/audit/index.ts` — Added `classifyPublishStatus` import; Pass 2 COMPONENT loop now derives `publishStatus` via cast; `unpublishedCount` accumulation before `assembleReport` call

## Decisions Made

- IMPL-01: `classifyPublishStatus()` extracted as exported pure function — testable without Figma runtime, no mocking required for classification logic
- IMPL-02: New `unpublishedCount` parameter inserted as 4th argument in `assembleReport()`, between `tokens` and `fileId` — all test callers updated with `0` as auto-fix
- IMPL-03: Figma `remote`/`master` properties accessed via `(comp as unknown as { remote: boolean; master: unknown })` cast in `index.ts` — Figma COMPONENT nodes have these at runtime but TypeScript's `SceneNode` type doesn't expose them directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated utils.test.ts assembleReport call sites to new 6-arg signature**
- **Found during:** Task 1 (implement assembleReport change)
- **Issue:** `utils.test.ts` called `assembleReport` with 5 arguments; adding `unpublishedCount` as 4th arg broke all 11 existing call sites
- **Fix:** Updated all 11 `assembleReport` calls in `utils.test.ts` to pass `0` as the new 4th argument; also added `publishStatus: 'published' as const` to the `ComponentSpec` fixture (was missing required field)
- **Files modified:** `packages/plugin/src/sandbox/audit/utils.test.ts`
- **Verification:** 121 tests pass; tsc clean
- **Committed in:** `e2ad7ca` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — required field updates for signature change)
**Impact on plan:** Auto-fix necessary for correctness. No scope creep. Two extra `assembleReport` test cases added for `unpublishedComponents` field coverage.

## Issues Encountered

None — implementation was straightforward following the plan specification exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `classifyPublishStatus` and `unpublishedComponents` plumbing complete — Plan 03 (AuditView UI) can now wire `state.unpublishedCount` to the MetricCard badge
- Plan 04 (MCP streaming) has `AuditReport.summary.unpublishedComponents` correctly populated at audit time
- All 121 tests pass; both plugin and shared packages type-check clean

---
*Phase: 09-audit-flow-v2*
*Completed: 2026-03-14*

## Self-Check: PASSED

- packages/plugin/src/sandbox/audit/components.ts — FOUND
- packages/plugin/src/sandbox/audit/utils.ts — FOUND
- packages/plugin/src/sandbox/audit/index.ts — FOUND
- packages/plugin/src/sandbox/audit/components.test.ts — FOUND
- .planning/phases/09-audit-flow-v2/09-02-SUMMARY.md — FOUND
- Commit e2ad7ca — FOUND
- classifyPublishStatus in components.ts — FOUND
- unpublishedCount in utils.ts — FOUND
- unpublishedCount in index.ts — FOUND
- publishStatus in index.ts — FOUND
