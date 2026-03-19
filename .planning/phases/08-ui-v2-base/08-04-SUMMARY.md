---
phase: 08-ui-v2-base
plan: 04
subsystem: ui
tags: [react, vite, figma-plugin, visual-verification, build]

# Dependency graph
requires:
  - phase: 08-03
    provides: AuditView + ConfigView + App.tsx thin routing shell — all three screens implemented

provides:
  - Plugin build verified pixel-faithful in Figma Desktop (all three screens approved)
  - Three rounds of iterative visual fixes applied before final approval
  - Phase 8 acceptance gate passed — human confirmed "approved"

affects:
  - 09-audit-flow-v2
  - 10-configuration-flow-v2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Iterative visual polish via Figma Desktop load-and-inspect after each fix commit"
    - "Replace Figma CSS vars (var(--figma-color-*)) with hardcoded token constants for rendering predictability"
    - "Plugin window uses 100% width / 100vh height in CSS — sandbox sets pixel dimensions via figma.ui.resize()"

key-files:
  created: []
  modified:
    - packages/plugin/src/ui/tokens.ts
    - packages/plugin/src/ui/App.tsx
    - packages/plugin/src/ui/components/Tabs.tsx
    - packages/plugin/src/ui/components/Accordion.tsx
    - packages/plugin/src/ui/components/AccordionItem.tsx
    - packages/plugin/src/ui/components/MetricCard.tsx
    - packages/plugin/src/ui/views/AuditView.tsx
    - packages/plugin/src/ui/views/ConfigView.tsx
    - packages/plugin/src/sandbox/code.ts

key-decisions:
  - "UI-BUILD-01: Figma CSS vars (var(--figma-color-text/bg)) replaced with hardcoded token constants — plugin renders predictably regardless of Figma theme mode"
  - "UI-BUILD-02: Window width adjusted 592→380px after Figma visual check revealed 592px was too wide on screen"
  - "UI-BUILD-03: App.tsx uses 100%/100vh, components use 100% widths — sandbox code.ts owns pixel dimensions"
  - "UI-BUILD-04: Tabs active state: 2px bottom border COLOR_PRIMARY, no background fill — matches Figma design"
  - "UI-BUILD-05: Accordion categories default to closed (open=false) — shows category labels without overwhelming results view"
  - "UI-BUILD-06: Accordion accepts accent prop for 3px colored left border per category (color, typography, spacing, border, effects, component)"
  - "UI-BUILD-07: ConfigView code block gets Copy button showing checkmark for 2s on click"
  - "UI-BUILD-08: Issue count uses report.issues.length (real count) replacing hardcoded 287"
  - "UI-BUILD-09: App.tsx root div uses borderRadius 0 0 20px 20px (bottom corners only) — top corners clipped by Figma window chrome"
  - "UI-BUILD-10: MetricCard uses flex:1 so two cards fit side by side — replaces hardcoded 347px width"

patterns-established:
  - "Visual-verify-fix cycle: build → load in Figma Desktop → inspect → fix in code → rebuild → repeat until approved"
  - "Token-only rule: no hardcoded hex values in components — all colors reference tokens.ts constants"

requirements-completed: [UIS-01, UIS-02, UIS-03, UIS-04, UIX-07]

# Metrics
duration: ~60min
completed: 2026-03-12
---

# Phase 8 Plan 04: Plugin Build + Human Visual Verification Summary

**Three iterative fix rounds applied after initial build; human confirmed all three Figma plugin screens approved in Figma Desktop**

## Performance

- **Duration:** ~60 min (build + 3 fix iterations + human verification)
- **Started:** 2026-03-12T18:59:00Z
- **Completed:** 2026-03-12T20:45:00Z
- **Tasks:** 2/2 (Task 1: build; Task 2: human checkpoint — approved)
- **Files modified:** 9 (tokens.ts, App.tsx, Tabs.tsx, Accordion.tsx, AccordionItem.tsx, MetricCard.tsx, AuditView.tsx, ConfigView.tsx, code.ts)

## Accomplishments

- Plugin built successfully with `npm run build` — `dist/ui.html` and `dist/code.js` produced
- Three rounds of visual polish applied based on Figma Desktop inspection: invisible text fix, layout fixes, tab style fixes, accordion color accents, copy button, width correction
- Human verified all three screens (Audit-1 empty state, Audit-2 results state, Config-1 configuration) in Figma Desktop and confirmed "approved"

## Task Commits

1. **Task 1: Build the plugin for Figma** — no commit (dist/ is gitignored)
2. **Task 2: Visual accuracy verification in Figma** — three iterative fix commits:
   - `1959c00` fix(08-04): replace Figma CSS vars with hardcoded tokens, fix idle layout, fix widths
   - `6636f29` fix(08-04): tabs underline, pinned button, real count, width, full-width banner, category colors
   - `cfc25f0` fix(08-04): tabs full-width, copy button, bottom-only radius, accordions start closed

**Plan metadata:** (docs commit — see Final Commit below)

## Files Created/Modified

- `packages/plugin/src/ui/tokens.ts` — added COLOR_TEXT, COLOR_TEXT_SECONDARY, COLOR_BG_SECONDARY constants
- `packages/plugin/src/ui/App.tsx` — 100%/100vh sizing, overflow:hidden wrapper, bottom-only border radius
- `packages/plugin/src/ui/components/Tabs.tsx` — active tab 2px bottom border, 100% width, no padding sides
- `packages/plugin/src/ui/components/Accordion.tsx` — default closed, accent prop for 3px colored left border, 100% width
- `packages/plugin/src/ui/components/AccordionItem.tsx` — replaced CSS var text colors with token constants
- `packages/plugin/src/ui/components/MetricCard.tsx` — flex:1 width, minHeight 100, CSS var replacement
- `packages/plugin/src/ui/views/AuditView.tsx` — real issue count, pinned CTA button, full-width StatusBanner, scrollable middle
- `packages/plugin/src/ui/views/ConfigView.tsx` — Copy button on code block, overflowY:auto, CSS var replacement
- `packages/plugin/src/sandbox/code.ts` — window width adjusted 592→380px

## Decisions Made

- **Figma CSS vars → token constants (UI-BUILD-01):** Initial build showed invisible text because `var(--figma-color-text)` renders as white in some Figma contexts. All CSS variable references replaced with hardcoded token constants from `tokens.ts`.
- **Window width 592→380px (UI-BUILD-02):** Figma Desktop visual check revealed 592px was wider than expected on screen. Width reduced to 380px while height stays at 600px.
- **100% width approach (UI-BUILD-03):** Components use `100%` widths rather than hardcoded pixel values — the sandbox `code.ts` owns the pixel dimensions via `figma.ui.resize()`.
- **Accordion accent colors (UI-BUILD-06):** Each audit category gets a distinct 3px left border color for visual hierarchy in results view (red=color, purple=typography, green=spacing, amber=border, orange=effects, blue=components).
- **Accordion default closed (UI-BUILD-05):** Initial build had accordions open by default per Phase 8 plan; changed to closed after Figma inspection showed collapsed state is cleaner for the results view initial presentation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Figma CSS variables rendered as invisible text**
- **Found during:** Task 1 + Task 2 (first Figma Desktop load)
- **Issue:** `var(--figma-color-text)` and `var(--figma-color-bg-secondary)` were resolving to white or invisible colors in the Figma plugin webview context, making all text invisible on white background
- **Fix:** Added 3 new token constants to `tokens.ts` (COLOR_TEXT=#1E1E1E, COLOR_TEXT_SECONDARY=#666666, COLOR_BG_SECONDARY=#F0F0F0) and replaced all CSS variable references in 6 components/views
- **Files modified:** tokens.ts, App.tsx, Tabs.tsx, Accordion.tsx, AccordionItem.tsx, MetricCard.tsx, AuditView.tsx, ConfigView.tsx
- **Committed in:** `1959c00`

**2. [Rule 1 - Bug] Plugin window 592px too wide; components used hardcoded pixel widths**
- **Found during:** Task 2 (Figma Desktop visual inspection)
- **Issue:** 592px window was visually too wide; components (Accordion 570px, MetricCard 347px, Tabs 592px) used hardcoded pixel widths that overflowed or didn't fill correctly
- **Fix:** Reduced window to 380px in code.ts; changed all component widths to `100%` or `flex:1`; App.tsx uses 100%/100vh
- **Files modified:** code.ts, App.tsx, Tabs.tsx, Accordion.tsx, MetricCard.tsx, AuditView.tsx
- **Committed in:** `6636f29`

**3. [Rule 1 - Bug] Tab active state wrong; button not pinned; issue count hardcoded**
- **Found during:** Task 2 (second Figma Desktop inspection)
- **Issue:** Active tab showed filled background instead of underline; CTA button scrolled with content instead of staying pinned at bottom; issue count showed static "287" instead of real count
- **Fix:** Tabs active state uses 2px bottom border + no background fill; AuditView uses flex layout with scrollable middle section and pinned bottom button; count uses `report.issues.length`
- **Files modified:** Tabs.tsx, AuditView.tsx
- **Committed in:** `6636f29`

**4. [Rule 2 - Missing Critical] Copy button added to config code block**
- **Found during:** Task 2 (third Figma Desktop inspection)
- **Issue:** Config-1 code block had no copy mechanism — users would need to manually select and copy the JSON config, which is error-prone for a multi-line code block
- **Fix:** Added Copy button to ConfigView code block with 2-second "Copied" confirmation state
- **Files modified:** ConfigView.tsx
- **Committed in:** `cfc25f0`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 missing critical)
**Impact on plan:** All fixes required for correct visual rendering and usability. Invisible text was a critical rendering bug. Width/layout fixes were necessary for visual accuracy. Copy button is a usability requirement for the config code block.

## Issues Encountered

- Figma CSS variables (`var(--figma-color-*)`) behave differently in the plugin webview than expected — they resolved to invisible values. This is a known Figma plugin quirk: CSS variables are only reliable when the plugin respects Figma's theme; using hardcoded tokens is the more predictable approach.
- The 592px window width specified in Phase 8 context turned out to be too wide when viewed in actual Figma Desktop — adjusted to 380px based on human visual feedback.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 8 complete: all three plugin screens render correctly in Figma Desktop and are human-approved
- Phase 9 (Audit Flow v2) can begin: streaming progress, unpublished detection, AI Context status
- Phase 10 (Configuration Flow v2) can begin: CSS framework selector, connection status, MCP capability summary
- No blockers

---
*Phase: 08-ui-v2-base*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: `1959c00` fix(08-04): replace Figma CSS vars with hardcoded tokens, fix idle layout, fix widths
- FOUND: `6636f29` fix(08-04): tabs underline, pinned button, real count, width, full-width banner, category colors
- FOUND: `cfc25f0` fix(08-04): tabs full-width, copy button, bottom-only radius, accordions start closed
- FOUND: `.planning/phases/08-ui-v2-base/08-04-SUMMARY.md`
