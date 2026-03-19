---
phase: 09-audit-flow-v2
plan: "04"
subsystem: ui
tags: [react, typescript, figma-plugin, audit-flow, progress-bar, context-status]

# Dependency graph
requires:
  - phase: 09-audit-flow-v2
    provides: AppState with contextStatus + unpublishedCount (09-01), publishStatus classification (09-02), SYNC_OUTDATED/INJECT_COMPLETE message handlers (09-01)
provides:
  - CONTEXT_STATUS_CHECK SandboxMessage type for startup missing-state signal
  - Startup sandbox detection: sends CONTEXT_STATUS_CHECK with status 'missing' when no prior injection
  - MetricCard optional badge prop — renders secondary text below label
  - AuditView scanning case with determinate progress bar (COLOR_PRIMARY, 4px, percent-based width)
  - AuditView complete case with contextStatus-driven StatusBanner (success/warning/error/none)
  - App.tsx extended downloadJson payload with version, fileKey, fileName, exportedAt, tokenCounts, componentCount, cssFramework, auditStatus, contextStatus
  - App.tsx passes contextStatus + unpublishedCount to AuditView
affects: [10-inject-flow-v2, 11-mcp-wiring, 12-release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "contextStatus-driven banner: null=no banner, injected=success, outdated=warning, missing=error"
    - "Startup signal pattern: sandbox sends CONTEXT_STATUS_CHECK on first use (no prior plugin data keys)"
    - "Extended JSON export: all metadata fields in a single payload for IDE context"

key-files:
  created: []
  modified:
    - packages/shared/src/messages.ts
    - packages/plugin/src/sandbox/code.ts
    - packages/plugin/src/ui/useAppMessages.ts
    - packages/plugin/src/ui/components/MetricCard.tsx
    - packages/plugin/src/ui/views/AuditView.tsx
    - packages/plugin/src/ui/App.tsx

key-decisions:
  - "STARTUP-01: CONTEXT_STATUS_CHECK only sent when startupKeys.length === 0 — SYNC_OUTDATED reserved for document change events, not startup"
  - "BANNER-01: contextStatus=null renders no StatusBanner — null is the default; banner only shown after explicit inject/outdated/missing signal"
  - "BADGE-01: MetricCard badge prop is optional and undefined-gated — badge rendered only when unpublishedCount > 0"
  - "EXPORT-01: downloadJson includes tokenCounts.byType (grouped by token type) for richer IDE context"

patterns-established:
  - "Startup gate pattern: check getPluginDataKeys().length === 0 before sending missing signal"
  - "Prop threading: App.tsx reads from state and threads contextStatus/unpublishedCount down to AuditView — no dispatch inside views"

requirements-completed: [UIX-01, UIX-02, UIX-03, UNPB-03]

# Metrics
duration: 30min
completed: 2026-03-14
---

# Phase 9 Plan 04: Audit Flow v2 UI Wiring Summary

**Startup missing-state detection, determinate progress bar, contextStatus-driven StatusBanner, unpublished badge in Components MetricCard, and extended JSON export payload — all Phase 9 UIX requirements met**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-14
- **Completed:** 2026-03-14
- **Tasks:** 4 (Tasks 0-2 auto, Task 3 human-verify)
- **Files modified:** 6

## Accomplishments

- Added `CONTEXT_STATUS_CHECK` SandboxMessage and startup check: plugin sandbox now detects first-time use (no prior plugin data keys) and signals UI to show the "No AI Context found" error banner
- Replaced the spinning/text-only scanning state with a determinate progress bar (COLOR_PRIMARY fill, 4px height, percent-based width, smooth 0.2s transition)
- AuditView complete case now derives StatusBanner variant from `contextStatus` instead of `isOutOfSync` — supports null (no banner), injected (success), outdated (warning), missing (error)
- MetricCard accepts optional `badge` prop rendered in monospace secondary text — Components card shows "N unpublished" badge when unpublishedCount > 0
- Extended `downloadJson` payload includes `version`, `fileKey`, `fileName`, `exportedAt`, `tokenCounts` (with `byType` breakdown), `componentCount`, `cssFramework`, `auditStatus`, `contextStatus`
- Human visual verification in Figma Desktop: all states confirmed correct (missing/scanning/complete-injected/complete-outdated, JSON export)

## Task Commits

Each task was committed atomically:

1. **Task 0: Add CONTEXT_STATUS_CHECK and wire startup missing-state detection** - `1a2108a` (feat)
2. **Task 1: Add MetricCard badge prop and upgrade AuditView scanning + complete cases** - `0e27a51` (feat)
3. **Task 2: Extend downloadJson metadata and wire contextStatus/unpublishedCount props** - `bd4bb6c` (feat)
4. **Task 3: Visual verification of all Phase 9 UI features in Figma** - human-approved (no code commit)

## Files Created/Modified

- `packages/shared/src/messages.ts` - Added `CONTEXT_STATUS_CHECK` variant to `SandboxMessage` union
- `packages/plugin/src/sandbox/code.ts` - Startup check: `getPluginDataKeys().length === 0` → send `CONTEXT_STATUS_CHECK` with status `'missing'`; removed unconditional `SYNC_OUTDATED` on startup
- `packages/plugin/src/ui/useAppMessages.ts` - Added `CONTEXT_STATUS_CHECK` case dispatching `SET_CONTEXT_STATUS`
- `packages/plugin/src/ui/components/MetricCard.tsx` - Added optional `badge?: string` prop, renders in 11px monospace secondary color when provided
- `packages/plugin/src/ui/views/AuditView.tsx` - Added `contextStatus` + `unpublishedCount` props; replaced scanning case with progress bar; replaced `isOutOfSync` banner logic with `contextStatus`-driven derivation
- `packages/plugin/src/ui/App.tsx` - Updated `downloadJson` signature and payload; updated `handleExportJson` to pass `cssFramework` and `contextStatus`; added `contextStatus` and `unpublishedCount` props to `<AuditView>`

## Decisions Made

- `STARTUP-01`: `CONTEXT_STATUS_CHECK` is only sent when `startupKeys.length === 0`. `SYNC_OUTDATED` is reserved exclusively for document change events, not startup. Prevents false "outdated" banners on every plugin open.
- `BANNER-01`: `contextStatus === null` produces no `StatusBanner`. The banner only appears after an explicit signal (inject complete, sync outdated, or startup missing). This is the default state after any audit that has not yet been injected.
- `BADGE-01`: `badge` prop is `undefined`-gated in MetricCard — renders only when `unpublishedCount > 0`. Zero unpublished shows a clean card.
- `EXPORT-01`: `downloadJson` includes `tokenCounts.byType` (counts grouped by token type) alongside `tokenCounts.total`. Provides richer IDE/MCP context for downstream consumers.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 9 UIX requirements (UIX-01, UIX-02, UIX-03, UNPB-03) are implemented and human-verified
- `contextStatus` state machine complete: null → missing (startup) → injected (inject complete) → outdated (document change)
- Plugin builds successfully; all UI states render correctly in Figma Desktop
- Ready for Phase 10: Inject Flow v2 (implementing the actual inject + re-inject flows)

---
*Phase: 09-audit-flow-v2*
*Completed: 2026-03-14*
