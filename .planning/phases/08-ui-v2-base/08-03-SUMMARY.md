---
phase: 08-ui-v2-base
plan: 03
subsystem: ui
tags: [react, typescript, figma-plugin, views, routing]

# Dependency graph
requires:
  - phase: 08-01
    provides: tokens.ts design constants, Tab type rename, window dimensions
  - phase: 08-02
    provides: 6 atomic UI components (Tabs, Button, StatusBanner, MetricCard, Accordion, AccordionItem)
  - phase: 07-04
    provides: state.ts + useAppMessages.ts pure state layer consumed by App.tsx
provides:
  - AuditView.tsx — all 5 phase states (idle/scanning/injecting/complete/error)
  - ConfigView.tsx — static Config-1 content with all locked copy
  - App.tsx — thin routing shell composing views with useReducer + useAppMessages
affects:
  - 08-04 (human verification of rendered UI)
  - 09 (streaming/unpublished detection added on top of these views)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - View files compose atomic components; views receive state slices + handlers as props (no dispatch in views)
    - App.tsx is single-responsibility routing shell — owns state, routes by tab, delegates all rendering to views
    - CATEGORY_ORDER + CATEGORY_LABELS at module level (not inside JSX) for TS strict compliance
    - Accordion list uses 'margin: 0 11px' wrapper (not SPACING_CONTENT) to achieve 570px accordion width in 592px frame

key-files:
  created:
    - packages/plugin/src/ui/views/AuditView.tsx
    - packages/plugin/src/ui/views/ConfigView.tsx
  modified:
    - packages/plugin/src/ui/App.tsx

key-decisions:
  - "UI-VIEW-01: AuditView props are state slices + handlers — no dispatch or postMessage inside view"
  - "UI-VIEW-02: Accordion list uses margin 0 11px (not SPACING_CONTENT padding) to match 570px Accordion in 592px frame"
  - "UI-VIEW-03: Summary sentence 'We've detected 287 elements...' uses locked copy for Phase 8; dynamic substitution deferred to Phase 9"
  - "UI-VIEW-04: ConfigView renders href='#' for GitHub repo links — URL deferred to Phase 12"

patterns-established:
  - "View pattern: views/ files receive all state as props; App.tsx is the sole useReducer owner"
  - "Locked copy pattern: string literals in JSX match CONTEXT.md exactly, no abstraction"

requirements-completed: [UIS-01, UIS-02, UIS-03, UIX-07]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 8 Plan 03: AuditView + ConfigView + App.tsx Routing Shell Summary

**AuditView (5 phase states) + ConfigView (static Config-1) + App.tsx rewritten as thin routing shell — completes the visible plugin UI**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-12T18:55:40Z
- **Completed:** 2026-03-12T18:58:55Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 rewritten)

## Accomplishments

- AuditView.tsx renders all 5 phase states: idle (Audit-1 empty with locked headline/subtitle/CTA), scanning (progress + node name), injecting (loading text), complete (Audit-2 with StatusBanner/MetricCards/Accordion list/CTA), error (error text + Try Again button)
- ConfigView.tsx renders all Config-1 locked copy: MCP Server Setup title, 5 numbered steps, MCP JSON code block, Available MCP tools section, Export variables in JSON button (disabled when no report)
- App.tsx rewritten from 673-line v1 monolith to 91-line thin shell: useReducer + useAppMessages + Tabs + tab routing only; all v1 inline sub-components and render helpers removed
- Full test suite: 113 tests green; TypeScript compiles with zero errors; zero 'ai-context' strings in plugin source

## Task Commits

Each task was committed atomically:

1. **Task 1: AuditView — all 5 phase states** - `23ff3f1` (feat)
2. **Task 2: ConfigView + App.tsx rewrite** - `35c5db4` (feat)
3. **Task 3: Full build verification** - no code changes (verification only)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `packages/plugin/src/ui/views/AuditView.tsx` — 5-phase switch: idle/scanning/injecting/complete/error; uses all 6 atomic components
- `packages/plugin/src/ui/views/ConfigView.tsx` — static Config-1 locked copy; MCP_CONFIG_SNIPPET at module level; Export button disabled when no report
- `packages/plugin/src/ui/App.tsx` — rewritten from scratch: 91 total lines, thin routing shell only

## Decisions Made

- UI-VIEW-01: Views receive state slices as props and handlers as callbacks — no dispatch or parent.postMessage inside view files. This keeps views pure and testable.
- UI-VIEW-02: Accordion list section uses `margin: '0 11px'` wrapper div (not SPACING_CONTENT=24 padding) to achieve the 570px Accordion component width within the 592px frame. Other complete-state sections use standard SPACING_CONTENT horizontal padding.
- UI-VIEW-03: Summary sentence 'We've detected 287 elements without variables applied.' is locked copy per CONTEXT.md — dynamic count substitution deferred to Phase 9.
- UI-VIEW-04: GitHub repo anchor links use `href="#"` per plan discretion — actual URL confirmed Phase 12.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All visible plugin UI complete: AuditView, ConfigView, and App.tsx routing shell
- Phase 8 Plan 04 (human verification checkpoint) is the final plan: visual verification of Audit-1, Audit-2, Config-1 screens in Figma plugin sandbox
- Phase 9 can add streaming progress, dynamic issue counts, and unpublished component detection on top of the established view pattern

## Self-Check: PASSED

- AuditView.tsx: FOUND at packages/plugin/src/ui/views/AuditView.tsx
- ConfigView.tsx: FOUND at packages/plugin/src/ui/views/ConfigView.tsx
- App.tsx: FOUND at packages/plugin/src/ui/App.tsx
- SUMMARY.md: FOUND at .planning/phases/08-ui-v2-base/08-03-SUMMARY.md
- Commit 23ff3f1: FOUND (Task 1 — AuditView)
- Commit 35c5db4: FOUND (Task 2 — ConfigView + App.tsx)

---
*Phase: 08-ui-v2-base*
*Completed: 2026-03-12*
