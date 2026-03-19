---
phase: 10-configuration-flow-v2
plan: "02"
subsystem: ui
tags: [react, figma-plugin, configview, css-framework, file-key, status-banner]

# Dependency graph
requires:
  - phase: 10-01
    provides: FILE_KEY SandboxMessage type, SET_FILE_KEY AppAction, fileKey AppState slice
  - phase: 09-04
    provides: contextStatus state machine, StatusBanner component, UI-VIEW-01 pattern
provides:
  - FILE_KEY pipeline wired end-to-end (sandbox startup → useAppMessages → App.tsx → ConfigView)
  - CSS framework dropdown in ConfigView (4 options, state-only update)
  - File key connection row (green dot, truncated key, copy button, conditional on non-null fileKey)
  - Export status banner above Export button (driven by contextStatus)
  - Fixed MCP tools copy ("Check the GitHub repo to see available MCP tools.")
affects: [11-inject-flow-v2, 12-distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FILE_KEY postMessage pipeline: sandbox figma.fileKey ?? null → SandboxMessage → useAppMessages case → dispatch SET_FILE_KEY → ConfigView prop"
    - "Conditional file key row: only rendered when fileKey !== null (local/unsaved files show nothing)"
    - "Copy button with local useState(false) reset after 2000ms — same pattern as code block copy button"

key-files:
  created: []
  modified:
    - packages/plugin/src/sandbox/code.ts
    - packages/plugin/src/ui/useAppMessages.ts
    - packages/plugin/src/ui/App.tsx
    - packages/plugin/src/ui/views/ConfigView.tsx

key-decisions:
  - "MCP Status section always visible (not conditional on fileKey) — connection status shown regardless; only the file key row is conditional"
  - "FILE_KEY send is unconditional at startup — always sent even when null, so UI always knows availability state"
  - "ConfigView never calls dispatch or postMessage directly — all handlers threaded from App.tsx (UI-VIEW-01 maintained)"
  - "Local fileKeyCopied state in ConfigView component (not in AppState) — transient UI feedback does not belong in global state"

patterns-established:
  - "ConfigView UI-VIEW-01: all state slices and handlers passed as props from App.tsx — no dispatch/postMessage inside view"
  - "Conditional section pattern: render nothing (no wrapper) when driving data is null — avoids empty space"

requirements-completed: [UIX-04, UIX-05, UIX-06]

# Metrics
duration: 35min
completed: 2026-03-16
---

# Phase 10 Plan 02: ConfigView v2 — CSS Framework, File Key, Status Banner Summary

**CSS framework dropdown, file key connection row, and contextStatus-driven export banner added to ConfigView via FILE_KEY postMessage pipeline wired from sandbox through useAppMessages to App.tsx props.**

## Performance

- **Duration:** ~35 min (including human verification in Figma Desktop)
- **Started:** 2026-03-16T20:08:00Z
- **Completed:** 2026-03-16T20:41:00Z
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 4

## Accomplishments

- FILE_KEY pipeline wired end-to-end: `code.ts` sends `figma.fileKey ?? null` unconditionally on startup; `useAppMessages` handles it via `SET_FILE_KEY` dispatch; App.tsx threads `fileKey` + `cssFramework` + `onCssFrameworkChange` + `contextStatus` as props to ConfigView
- ConfigView v2 delivered four new UI sections: CSS framework dropdown (4 options, state-only update), file key connection row (green dot + "Connected" + truncated key + copy button, conditional on `fileKey !== null`), export status banner above Export button (driven by `contextStatus` null-state machine), and fixed MCP tools copy ("Check the GitHub repo to see available MCP tools.")
- All 144 tests pass with no regressions; plugin built clean in TypeScript strict mode; human-verified in Figma Desktop with all features confirmed working

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire FILE_KEY message pipeline** - `f333f7c` (feat)
2. **Task 2: Extend ConfigView with CSS selector, file key, status banner, MCP copy fix** - `d3460d3` (feat)
3. **Fix: MCP Status section always visible; key row conditional** - `fb669a0` (fix)
4. **Task 3: Human verify ConfigView v2 in Figma** - approved by user (no commit — verification only)

## Files Created/Modified

- `packages/plugin/src/sandbox/code.ts` — Adds FILE_KEY postMessage unconditionally at startup using `figma.fileKey ?? null`
- `packages/plugin/src/ui/useAppMessages.ts` — Adds `case 'FILE_KEY'` dispatching `SET_FILE_KEY` action
- `packages/plugin/src/ui/App.tsx` — Threads `cssFramework`, `onCssFrameworkChange`, `fileKey`, `contextStatus` props to ConfigView
- `packages/plugin/src/ui/views/ConfigView.tsx` — Full rewrite adding CSS framework selector, file key row, export status banner, and MCP copy fix

## Decisions Made

- MCP Status section (green dot + "Connected to Figma" label) is always visible — only the file key row (truncated key + copy button) is conditional on `fileKey !== null`. This was a deviation fix from the initial Task 2 implementation which made the entire section conditional, causing the connection indicator to disappear for local files.
- `FILE_KEY` is sent unconditionally at startup (null when `figma.fileKey` is undefined for local/unsaved files) — UI always knows availability without requiring a separate "no key" message type.
- Local `fileKeyCopied` state inside ConfigView (not in AppState) — transient 2s feedback state does not belong in global reducer.
- UI-VIEW-01 pattern maintained: ConfigView never calls dispatch or postMessage; all handlers passed as props from App.tsx.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MCP Status section was incorrectly made conditional on fileKey**
- **Found during:** Task 2 (ConfigView rewrite), discovered during human verification (Task 3)
- **Issue:** Initial ConfigView implementation wrapped the entire "MCP Status" section (green dot + "Connected to Figma") in the `fileKey !== null` condition. This caused the connection indicator to disappear entirely for local/unsaved files, even though the MCP connection status is independent of file key availability.
- **Fix:** Moved the conditional to wrap only the file key row (truncated key + copy button), keeping the green dot + "Connected to Figma" always visible in the Config tab.
- **Files modified:** `packages/plugin/src/ui/views/ConfigView.tsx`
- **Verification:** Human-verified in Figma Desktop — MCP Status label with green dot always visible; key row shown only when file key available
- **Committed in:** `fb669a0` (dedicated fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in conditional rendering scope)
**Impact on plan:** Fix necessary for correct UX. No scope creep.

## Issues Encountered

None beyond the deviation above. TypeScript compilation was clean after Task 2. All 144 tests passed throughout.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 requirements UIX-04, UIX-05, UIX-06 all satisfied and human-verified
- ConfigView v2 complete — Config tab now shows CSS framework selector, file key connection status, export status guidance, and correct MCP tools copy
- FILE_KEY pipeline established as pattern for future sandbox → UI state wiring
- Ready for Phase 10 Plan 03 (next plan in Configuration Flow v2) or Phase 11 (Inject Flow v2)

---
*Phase: 10-configuration-flow-v2*
*Completed: 2026-03-16*
