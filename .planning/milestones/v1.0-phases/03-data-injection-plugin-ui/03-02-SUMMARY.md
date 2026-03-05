---
phase: 03-data-injection-plugin-ui
plan: 02
subsystem: ui
tags: [react, typescript, figma-plugin, inline-styles, state-machine]

# Dependency graph
requires:
  - phase: 02-audit-engine
    provides: AuditReport, AuditIssue, shared types
  - phase: 03-data-injection-plugin-ui/03-01
    provides: INJECT_DATA sandbox handler, INJECT_COMPLETE/INJECT_ERROR messages
provides:
  - Complete production two-tab plugin UI replacing debug scaffold
  - Audit tab with idle/scanning/injecting/complete/error state machine
  - AI Context tab with CSS framework selector, Export JSON, mcp.json snippet
  - SELECT_NODE canvas navigation from issue rows
  - Out of Sync banner with inline Re-inject
affects:
  - 03-03-PLAN (must patch code.ts to emit SCAN_COMPLETE from INJECT_DATA handler)
  - MCP server phase (AI Context tab shows mcp.json setup instructions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline sub-components inside single file (IssueGroup, StatCard) for minimal bundle surface
    - Phase state machine (idle/scanning/injecting/complete/error) drives all Audit tab rendering
    - Figma CSS variable tokens for theming (var(--figma-color-*)) throughout all inline styles
    - Exhaustiveness check via never type in message switch default branch

key-files:
  created: []
  modified:
    - packages/plugin/src/ui/App.tsx

key-decisions:
  - "SCAN_COMPLETE received mid-INJECT_DATA flow sets report state then transitions to injecting; INJECT_COMPLETE transitions to complete — this requires code.ts INJECT_DATA handler to emit SCAN_COMPLETE before INJECT_COMPLETE (noted for 03-03 patch)"
  - "IssueGroup and StatCard defined as inline function components inside App.tsx to keep file count minimal and bundle size predictable"
  - "healthColor() uses hex #1bc47d (green) and #f5a623 (amber) with fallback to var(--figma-color-bg-danger) for red — Figma CSS vars have no success color"
  - "Export JSON button disabled with opacity 0.5 and cursor not-allowed when report is null, plus title tooltip"
  - "figma object not available in UI iframe — fileName shown from report.fileName or 'Run an audit first' placeholder"

patterns-established:
  - "Pattern: All Figma plugin UI styles use var(--figma-color-*) CSS variables — never hardcoded hex except green/amber health colors"
  - "Pattern: parent.postMessage({ pluginMessage: msg }, '*') with typed UIMessage for all sandbox sends"
  - "Pattern: window.addEventListener('message') with event.data.pluginMessage cast for all sandbox receives"

requirements-completed: [DATA-08, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 3 Plan 02: Plugin UI — Production Two-Tab Component Summary

**Complete React two-tab plugin UI with Audit state machine (idle/scanning/injecting/complete/error) and AI Context tab, replacing the debug scaffold with a Figma-native 320x480px interface using only inline styles and shared types.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T18:28:14Z
- **Completed:** 2026-03-03T18:30:05Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Replaced 95-line debug scaffold with 460-line production component covering all spec requirements
- Audit tab state machine: idle (centered Audit & Inject button), scanning (progress with node name), injecting (loading), complete (full dashboard), error (message + retry)
- Complete dashboard: success line "✓ AI Context injected — Ready for Trae/Cursor", health score color banner, 2x2 stat grid, collapsible IssueGroup sections by category, Re-inject button
- AI Context tab: native select for 4 CSS frameworks, Export JSON blob download, mcp.json snippet with clipboard Copy button
- Out of Sync banner with danger colors and inline Re-inject button
- TypeScript strict mode zero errors; full Vite build produces dist/ui.html at 204.55 kB

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the complete two-tab App.tsx** - `fea82a9` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `packages/plugin/src/ui/App.tsx` - Complete production two-tab Figma plugin UI with state machine, dashboard, and AI Context tab

## Decisions Made
- SCAN_COMPLETE from INJECT_DATA handler required: the UI's INJECT_DATA flow listens for SCAN_COMPLETE (to get report for dashboard) then INJECT_COMPLETE (to show complete phase). If code.ts INJECT_DATA handler does not emit SCAN_COMPLETE, the dashboard will never populate after injection. Plan 03-01's INJECT_DATA handler is currently a stub — 03-03 MUST patch code.ts to send `{ type: 'SCAN_COMPLETE', report }` before sending `{ type: 'INJECT_COMPLETE', ... }`.
- Chose inline sub-components over separate files to keep bundle surface minimal and adhere to the single-file plan constraint.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**SCAN_COMPLETE sequencing note (non-blocking):** The 03-01 PLAN described patching code.ts's INJECT_DATA handler to emit SCAN_COMPLETE before INJECT_COMPLETE. At the time this plan executed, the INJECT_DATA case in `packages/plugin/src/sandbox/code.ts` is still a Phase 3 stub (empty break). Plan 03-03 must implement the full INJECT_DATA handler and emit SCAN_COMPLETE with the report object before emitting INJECT_COMPLETE. Without this patch, the Audit tab will complete-phase render but show "No report available." instead of the dashboard.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Production UI is ready for live testing once 03-01 (data injection sandbox handler) is complete
- 03-03 must patch code.ts INJECT_DATA handler to: (1) call runAudit(), (2) send `{ type: 'SCAN_COMPLETE', report }`, (3) call injectReport(report), (4) send `{ type: 'INJECT_COMPLETE', bytesWritten, chunkCount }`
- CSS framework selector state is stored in UI but not yet wired to any code generation — that is out of scope for this phase

---
*Phase: 03-data-injection-plugin-ui*
*Completed: 2026-03-03*
