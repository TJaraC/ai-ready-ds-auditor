---
phase: 08-ui-v2-base
plan: 02
subsystem: ui
tags: [react, figma-plugin, typescript, inline-styles, design-tokens]

# Dependency graph
requires:
  - phase: 08-ui-v2-base/08-01
    provides: tokens.ts design constants (COLOR_*, RADIUS_*, SPACING_*) and Tab type

provides:
  - Six atomic UI components in packages/plugin/src/ui/components/
  - Tabs.tsx: 592px tab navigation bar with audit/config tabs
  - Button.tsx: primary CTA button with hover and disabled states
  - StatusBanner.tsx: success/warning/error banner with icon prefixes
  - MetricCard.tsx: 347x202px numeric metric display card
  - Accordion.tsx: collapsible category section (defaults open, local useState)
  - AccordionItem.tsx: finding row with em-dash format and onClick(nodeId)

affects:
  - 08-03 (AuditView + ConfigView compose these components)
  - 08-04 (App.tsx thin shell routes to views that use these)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - React functional components with TypeScript strict (no any, exactOptionalPropertyTypes)
    - All design values imported from tokens.ts — zero hardcoded hex, zero hardcoded numbers
    - Figma CSS variables (var(--figma-color-*)) for theme-compatible text/background colors
    - Local useState for component-level state (hover, open) — no AppState involvement

key-files:
  created:
    - packages/plugin/src/ui/components/Tabs.tsx
    - packages/plugin/src/ui/components/Button.tsx
    - packages/plugin/src/ui/components/StatusBanner.tsx
    - packages/plugin/src/ui/components/MetricCard.tsx
    - packages/plugin/src/ui/components/Accordion.tsx
    - packages/plugin/src/ui/components/AccordionItem.tsx
  modified: []

key-decisions:
  - "UI-COMP-01: COLOR_SURFACE (#FFFFFF) used for white text color in Button and StatusBanner — avoids hardcoded '#FFFFFF' per no-hardcoded-hex rule"
  - "UI-COMP-02: AccordionItem text uses Unicode em-dash (\\u2014) — matches locked copy pattern 'nodeName — offendingValue'"
  - "UI-COMP-03: Accordion defaults to open state (useState(true)) — matches Figma Audit-2 open state"

patterns-established:
  - "Token-only styling: Every component imports named constants from ../tokens; no inline hex literals"
  - "Figma CSS vars for contextual colors: var(--figma-color-text), var(--figma-color-text-secondary), var(--figma-color-bg-secondary), var(--figma-color-bg-disabled)"
  - "Local state isolation: hover/open state in component useState, never bubbled to AppState"

requirements-completed: [UIS-01, UIS-02, UIS-03, UIS-04]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 8 Plan 02: Six Atomic UI Components Summary

**Six React components (Tabs, Button, StatusBanner, MetricCard, Accordion, AccordionItem) built with zero hardcoded hex values, all consuming design tokens from tokens.ts, TypeScript strict clean**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T18:50:45Z
- **Completed:** 2026-03-12T18:52:44Z
- **Tasks:** 2
- **Files modified:** 6 created

## Accomplishments
- All 6 atomic components from the Figma design exist in `packages/plugin/src/ui/components/`
- Zero hardcoded hex values in any component — all colors via token imports or Figma CSS variables
- TypeScript strict compilation clean (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- Accordion component properly isolates open/close state in local useState, no AppState involvement
- AccordionItem fires `onClick(nodeId)` on click and renders "nodeName — offendingValue" format

## Task Commits

Each task was committed atomically:

1. **Task 1: Tabs + Button + StatusBanner** - `1d2556b` (feat)
2. **Task 2: MetricCard + Accordion + AccordionItem** - `d707712` (feat)

**Plan metadata:** (pending — created after self-check)

## Files Created/Modified
- `packages/plugin/src/ui/components/Tabs.tsx` - 592px tab navigation bar, two 50%-width tab buttons for audit/config
- `packages/plugin/src/ui/components/Button.tsx` - Primary CTA button, COLOR_PRIMARY fill, COLOR_PRIMARY_HOVER on hover, disabled state
- `packages/plugin/src/ui/components/StatusBanner.tsx` - Variant-mapped banner (success/warning/error) with icon prefix characters
- `packages/plugin/src/ui/components/MetricCard.tsx` - 347x202px card showing numeric value + label, centered flex layout
- `packages/plugin/src/ui/components/Accordion.tsx` - Collapsible section header with count badge and chevron indicator, defaults open
- `packages/plugin/src/ui/components/AccordionItem.tsx` - Single finding row, truncated with ellipsis, hover highlight, onClick(nodeId)

## Decisions Made
- **UI-COMP-01:** `COLOR_SURFACE` (`#FFFFFF`) is used as the white text color for Button and StatusBanner. This avoids hardcoding `'#FFFFFF'` inline while keeping the intent clear — white on colored backgrounds.
- **UI-COMP-02:** AccordionItem uses `\u2014` (Unicode em-dash) in template string for the "nodeName — offendingValue" format, matching the locked copy pattern from CONTEXT.md.
- **UI-COMP-03:** Accordion defaults to `useState(true)` (open) to match the Figma Audit-2 design state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced hardcoded '#FFFFFF' with COLOR_SURFACE token**
- **Found during:** Task 1 post-verification grep check
- **Issue:** Button.tsx and StatusBanner.tsx used `color: '#FFFFFF'` for white text — violates the no-hardcoded-hex must_have
- **Fix:** Imported `COLOR_SURFACE` from tokens and used it for `color` value in both components
- **Files modified:** packages/plugin/src/ui/components/Button.tsx, packages/plugin/src/ui/components/StatusBanner.tsx
- **Verification:** `grep -r '#[0-9A-Fa-f]{6}' components/` returns zero matches; tsc still clean
- **Committed in:** `1d2556b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — correctness: no hardcoded hex)
**Impact on plan:** Necessary fix to satisfy must_have truth. No scope creep.

## Issues Encountered
None — all components compiled on first tsc run after the hex fix.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All 6 atomic components ready for composition in AuditView and ConfigView (Plan 03)
- All components type-check cleanly with strict TypeScript
- Token dependency established: components/ → tokens.ts pattern proven for Plan 03+ to follow

---
*Phase: 08-ui-v2-base*
*Completed: 2026-03-12*
