---
phase: 14-usability-performance
plan: 01
subsystem: audit
tags: [scope-config, audit-filtering, performance, skipSvg, shouldRunAuditor]

# Dependency graph
requires: []
provides:
  - AuditCategory type exported from shared/messages.ts
  - ScopeConfig type and DEFAULT_SCOPE_CONFIG in state.ts
  - shouldRunAuditor helper for category filtering in audit/index.ts
  - enabledCategories on START_SCAN/INJECT_DATA messages
  - SCOPE_LOADED/TOGGLE_SCOPE message types
  - SET_SCOPE_CONFIG and TOGGLE_SCOPE_CATEGORY reducer actions
affects: [14-02, ui-wiring, sandbox-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [shouldRunAuditor extracted helper for testability, static source analysis tests for Figma-only code paths]

key-files:
  created:
    - packages/plugin/src/sandbox/audit/scope.test.ts
    - packages/plugin/src/sandbox/audit/index.test.ts
  modified:
    - packages/shared/src/messages.ts
    - packages/plugin/src/ui/state.ts
    - packages/plugin/src/sandbox/audit/index.ts
    - packages/plugin/src/sandbox/code.ts
    - packages/plugin/src/ui/App.tsx
    - packages/plugin/src/ui/useAppMessages.ts
    - packages/plugin/src/ui/state.test.ts

key-decisions:
  - "shouldRunAuditor extracted as exported helper for unit testability without Figma globals"
  - "Static source analysis tests (readFileSync) for skipSvg guard and SVG concurrency -- avoids Figma runtime dependency"
  - "ComponentSpec collection NOT wrapped by scope guards -- always runs regardless of category filter"

patterns-established:
  - "shouldRunAuditor(category, enabledSet?) pattern for category filtering"
  - "Static source code analysis tests for code paths requiring Figma globals"

requirements-completed: [PERF-01, PERF-02, SCOPE-01, SCOPE-02]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 14 Plan 01: Scope Config Types, State, and Audit Filtering Summary

**AuditCategory type, ScopeConfig state management, shouldRunAuditor filtering helper, and PERF-01/PERF-02 test coverage for skipSvg guard and SVG batching**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T09:33:17Z
- **Completed:** 2026-03-20T09:38:48Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- AuditCategory type and ScopeConfig state management with full reducer support
- shouldRunAuditor helper with category filtering guards around all 6 auditor call sites
- 18 new tests: scope state (5), serialization/migration (5), shouldRunAuditor (5), PERF static analysis (3)
- All 196 tests pass (was 178)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types, messages, state, and audit filtering** - `ea3093e` (feat)
2. **Task 2: Tests for scope config state and serialization** - `7272700` (test)
3. **Task 3: Tests for shouldRunAuditor, skipSvg guard, SVG concurrency** - `dfc7783` (test)

## Files Created/Modified
- `packages/shared/src/messages.ts` - AuditCategory type, SCOPE_LOADED/TOGGLE_SCOPE messages, enabledCategories on START_SCAN/INJECT_DATA
- `packages/plugin/src/ui/state.ts` - ScopeConfig type, DEFAULT_SCOPE_CONFIG, SET_SCOPE_CONFIG/TOGGLE_SCOPE_CATEGORY actions
- `packages/plugin/src/sandbox/audit/index.ts` - shouldRunAuditor helper, enabledCategories in RunAuditOptions, category guards
- `packages/plugin/src/sandbox/code.ts` - TOGGLE_SCOPE case in exhaustive switch
- `packages/plugin/src/ui/App.tsx` - enabledCategories derived from scopeConfig for INJECT_DATA
- `packages/plugin/src/ui/useAppMessages.ts` - SCOPE_LOADED case dispatching SET_SCOPE_CONFIG
- `packages/plugin/src/ui/state.test.ts` - Scope config reducer tests
- `packages/plugin/src/sandbox/audit/scope.test.ts` - Serialization and migration tests
- `packages/plugin/src/sandbox/audit/index.test.ts` - shouldRunAuditor + PERF static analysis tests

## Decisions Made
- shouldRunAuditor extracted as exported helper for unit testability without Figma globals
- Static source analysis tests (readFileSync) for skipSvg guard and SVG concurrency -- avoids Figma runtime dependency
- ComponentSpec collection NOT wrapped by scope guards -- always runs regardless of category filter

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated code.ts exhaustive switch for TOGGLE_SCOPE**
- **Found during:** Task 1
- **Issue:** Adding TOGGLE_SCOPE to UIMessage caused exhaustive switch error in code.ts
- **Fix:** Added TOGGLE_SCOPE case (empty handler, wiring deferred to Plan 02)
- **Files modified:** packages/plugin/src/sandbox/code.ts
- **Committed in:** ea3093e

**2. [Rule 3 - Blocking] Updated useAppMessages.ts exhaustive switch for SCOPE_LOADED**
- **Found during:** Task 1
- **Issue:** Adding SCOPE_LOADED to SandboxMessage caused exhaustive switch error in useAppMessages.ts
- **Fix:** Added SCOPE_LOADED case dispatching SET_SCOPE_CONFIG action
- **Files modified:** packages/plugin/src/ui/useAppMessages.ts
- **Committed in:** ea3093e

**3. [Rule 3 - Blocking] Updated App.tsx INJECT_DATA message with enabledCategories**
- **Found during:** Task 1
- **Issue:** INJECT_DATA now requires enabledCategories field, App.tsx was missing it
- **Fix:** Derived enabledCategories from state.scopeConfig and passed to INJECT_DATA message
- **Files modified:** packages/plugin/src/ui/App.tsx
- **Committed in:** ea3093e

**4. [Rule 3 - Blocking] Rebuilt shared package dist for project references**
- **Found during:** Task 1
- **Issue:** Plugin tsconfig uses project references; shared/dist was stale without AuditCategory
- **Fix:** Ran `npx tsc --build packages/shared/tsconfig.json`
- **Files modified:** None (dist/ is gitignored)
- **Committed in:** N/A

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All auto-fixes were necessary to maintain type safety with exhaustive switches. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Types and filtering logic ready for Plan 02 UI wiring
- ScopeConfig state available in AppState for ConfigView scope toggles
- shouldRunAuditor helper available for sandbox message handler integration

---
*Phase: 14-usability-performance*
*Completed: 2026-03-20*
