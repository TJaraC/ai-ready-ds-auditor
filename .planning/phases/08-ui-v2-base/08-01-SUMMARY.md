---
phase: 08-ui-v2-base
plan: 01
subsystem: ui
tags: [react, typescript, design-tokens, figma-plugin]

# Dependency graph
requires:
  - phase: 07-architecture-refactor
    provides: state.ts AppState/AppAction/appReducer + useAppMessages.ts ready for consumption
provides:
  - tokens.ts with 11 design token constants (colors, radii, spacing)
  - Tab type renamed to 'audit' | 'config' — no 'ai-context' anywhere
  - Plugin window at 592x600px
affects: [08-02-components, 08-03-app-rewrite, 09-audit-ux, 10-config-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Design token constants in tokens.ts — components import named constants, no hardcoded hex/px values inline"
    - "Tab type string union drives App.tsx routing — rename flows through TypeScript strict checking"

key-files:
  created:
    - packages/plugin/src/ui/tokens.ts
    - packages/plugin/src/ui/tokens.test.ts
  modified:
    - packages/plugin/src/ui/state.ts
    - packages/plugin/src/ui/state.test.ts
    - packages/plugin/src/ui/App.tsx
    - packages/plugin/src/sandbox/code.ts

key-decisions:
  - "11 design token constants in tokens.ts — pure exports, no imports, no logic"
  - "Tab type renamed from 'ai-context' to 'config' — surgical edit to state.ts + tests + minimal App.tsx fix"
  - "Plugin window 592x600 set once at plugin open in code.ts showUI call"

patterns-established:
  - "Token pattern: import named constants from '../tokens' — no hardcoded values in components"
  - "TDD: change TS type first (RED via tsc), update test references (GREEN via vitest)"

requirements-completed: [UIS-04, UIX-07]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 8 Plan 01: Design Token Foundation, Tab Rename, and Window Resize Summary

**tokens.ts with 11 brand constants, Tab type renamed from 'ai-context' to 'config', plugin window at 592x600 — unblocking Plans 02 and 03**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T18:43:25Z
- **Completed:** 2026-03-12T18:47:20Z
- **Tasks:** 3 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Created tokens.ts with all 11 design token constants (5 colors, 3 radii, 3 spacing values) — no hardcoded values in components now possible
- Renamed Tab type from `'audit' | 'ai-context'` to `'audit' | 'config'` with zero TypeScript errors and 15/15 tests green
- Updated plugin window to 592x600px in code.ts — matches Figma frame dimensions exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tokens.ts with all 11 design token constants** - `2dbca54` (feat)
2. **Task 2: Rename Tab type 'ai-context' -> 'config', update tests and App.tsx** - `46f419c` (feat)
3. **Task 3: Update code.ts plugin window to 592x600** - `e907a35` (feat)

_Note: TDD tasks 1 and 2 used RED/GREEN cycle within single commits_

## Files Created/Modified
- `packages/plugin/src/ui/tokens.ts` - 11 named design token constants (colors, radii, spacing)
- `packages/plugin/src/ui/tokens.test.ts` - 12 tests verifying all token values and types
- `packages/plugin/src/ui/state.ts` - Tab type updated: `'audit' | 'config'`
- `packages/plugin/src/ui/state.test.ts` - 3 SET_TAB test locations updated to use 'config'
- `packages/plugin/src/ui/App.tsx` - Minimal fix: tab array + label updated ('config' / 'Config')
- `packages/plugin/src/sandbox/code.ts` - showUI width 320->592, height 480->600

## Decisions Made
- App.tsx received a minimal surgical fix (tab array + label only) — full rewrite deferred to Plan 03 as specified
- TDD for tokens.ts: test file created first (RED = file-not-found), then tokens.ts created (GREEN = 12 passing)
- TDD for Tab rename: state.ts changed first (RED = 3 tsc errors), then state.test.ts updated (GREEN = 15 passing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All created files exist on disk. All task commits (2dbca54, 46f419c, e907a35) verified in git log.

## Next Phase Readiness
- tokens.ts ready — Plans 02 and 03 can import named constants immediately
- Tab type 'config' ready — App.tsx routing in Plan 03 uses correct type
- Plugin window 592x600 ready — component layout at 570px width is now valid
- All TypeScript clean, all tests green

---
*Phase: 08-ui-v2-base*
*Completed: 2026-03-12*
