---
phase: 07-architecture-refactor
plan: "04"
subsystem: ui
tags: [react, useReducer, vitest, state-management, figma-plugin]

# Dependency graph
requires:
  - phase: 07-architecture-refactor
    provides: ARCH-01 through ARCH-04 architecture patterns established in prior plans
provides:
  - AppState, AppAction, appReducer, initialState in state.ts — zero React, zero Figma
  - useAppMessages hook in useAppMessages.ts — window message listener dispatching AppActions
  - 15 Vitest tests covering all 11 AppAction state transitions
  - App.tsx refactored to useReducer + useAppMessages — zero useState in App()
affects: [future-ui-plans, 07-architecture-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns: [useReducer-for-app-state, pure-reducer-no-side-effects, separate-message-hook, exhaustive-action-types-with-never]

key-files:
  created:
    - packages/plugin/src/ui/state.ts
    - packages/plugin/src/ui/state.test.ts
    - packages/plugin/src/ui/useAppMessages.ts
  modified:
    - packages/plugin/src/ui/App.tsx

key-decisions:
  - "ARCH-05: AppState + appReducer extracted to state.ts with zero React/Figma imports — pure, testable in Vitest/Node"
  - "useAppMessages hook is the single place consuming window message events, dispatching typed AppActions"
  - "App.tsx App() function now has zero useState calls — all state via useReducer(appReducer, initialState)"
  - "IssueGroup sub-component retains its own local useState for open/close toggle — local UI state is not AppState"
  - "AppAction union covers 11 action types with exhaustive never branch for future-proofing"

patterns-established:
  - "Pure reducer pattern: appReducer(state, action) returns new state with spread, never mutates"
  - "Message hook separation: useAppMessages(dispatch) maps SandboxMessage union to AppAction union"
  - "Exhaustive action handling: default never branch catches unhandled action types at compile time"

requirements-completed: [ARCH-05]

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 7 Plan 04: UI State Extraction Summary

**AppState + appReducer extracted to testable state.ts (zero React/Figma), useAppMessages hook isolates message listener, App.tsx refactored to useReducer with 15 passing Vitest tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T11:44:10Z
- **Completed:** 2026-03-10T11:47:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `state.ts` with AppState interface, AppAction union (11 types), appReducer, and initialState — importable in Vitest with zero React or Figma globals
- Created `state.test.ts` with 15 tests covering every AppAction type, all passing green
- Created `useAppMessages.ts` hook encapsulating window message listener — single responsibility, dispatches typed AppActions
- Refactored `App.tsx` App() function: replaced 8 useState calls + inline useEffect with `useReducer(appReducer, initialState)` + `useAppMessages(dispatch)`
- Full build passes (dist/ui.html produced), all 56 workspace tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create state.ts, state.test.ts, and useAppMessages.ts** - `0e9f116` (feat)
2. **Task 2: Refactor App.tsx to use useReducer + useAppMessages** - `ddc56a3` (refactor)

_Note: Task 1 used TDD — tests written before implementation, RED confirmed before GREEN_

## Files Created/Modified
- `packages/plugin/src/ui/state.ts` - AppState, AppAction (11 types), appReducer, initialState — zero React, zero Figma imports
- `packages/plugin/src/ui/state.test.ts` - 15 Vitest tests for all AppAction state transitions
- `packages/plugin/src/ui/useAppMessages.ts` - React hook listening to window messages, mapping SandboxMessage to AppAction dispatch
- `packages/plugin/src/ui/App.tsx` - Refactored: useReducer replaces 8 useState, useAppMessages replaces inline useEffect

## Decisions Made
- `IssueGroup` sub-component retains its local `useState` for its open/close toggle. This is correct — local accordion UI state is not part of `AppState`. The plan's requirement was "zero useState in App() function", which is fully met.
- Kept `Tab` and `CssFramework` type exports from state.ts, imported in App.tsx, eliminating duplicate type definitions.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- ARCH-05 complete. All 5 architecture refactors (ARCH-01 through ARCH-05) are now done.
- Phase 7 is complete — all 4 plans executed.
- state.ts is the canonical state definition for the plugin UI; future plans adding new states/actions should extend AppAction and update appReducer + state.test.ts.

---
*Phase: 07-architecture-refactor*
*Completed: 2026-03-10*
