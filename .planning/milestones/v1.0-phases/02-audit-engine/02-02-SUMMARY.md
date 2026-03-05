---
phase: 02-audit-engine
plan: "02"
subsystem: audit
tags: [figma-plugin, typescript, audit-engine, color, typography, spacing, components]

# Dependency graph
requires:
  - phase: 02-01
    provides: "buildIssue, rgbToHex helpers in utils.ts"
provides:
  - "auditFills function: detects hardcoded solid fill colors on scene nodes"
  - "auditStrokes function: detects hardcoded solid stroke colors on scene nodes"
  - "auditTypography function: detects hardcoded fontSize/fontWeight on text nodes"
  - "auditSpacing function: detects hardcoded padding/gap on auto-layout nodes"
  - "auditComponents function: detects FRAME/GROUP nodes matching known component names"
affects:
  - 02-03-orchestrator
  - 02-04-data-injection

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Category auditor pattern: pure synchronous function (node, pageName, lookupSet) => AuditIssue[]"
    - "figma.mixed guard: always check !== figma.mixed before String() conversion"
    - "Zero-value skip: zero padding is intentional, skip to reduce false-positive noise"
    - "Style-first check: if node has a bound style (fillStyleId/strokeStyleId/textStyleId) in styleIds set, skip per-property checks"

key-files:
  created:
    - packages/plugin/src/sandbox/audit/color.ts
    - packages/plugin/src/sandbox/audit/typography.ts
    - packages/plugin/src/sandbox/audit/spacing.ts
    - packages/plugin/src/sandbox/audit/components.ts
  modified: []

key-decisions:
  - "auditComponents uses FRAME/GROUP type guard — INSTANCE and COMPONENT node types are never flagged as disconnected"
  - "auditSpacing skips zero values — zero padding/gap is a design intent, not a missing token"
  - "auditFills/auditStrokes check style binding first (fillStyleId/strokeStyleId in styleIds set) before per-fill variable checks"
  - "auditTypography only reports fontWeight if fontSize is also unbound — avoids noise on partially-bound nodes"

patterns-established:
  - "Style guard before property guard: check named style binding before inspecting individual fill/stroke/font properties"
  - "figma.mixed sentinel handling: required before any String() conversion or property access on mixed fields"
  - "SOLID-only variable binding: only SOLID paints can have boundVariables.color; gradient/image/video paints are skipped"

requirements-completed: [AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 2 Plan 02: Category Auditors Summary

**Four pure synchronous auditors (color fills/strokes, typography, spacing, components) each returning AuditIssue[] with full figma.mixed guards and style-binding shortcuts**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-03T13:28:45Z
- **Completed:** 2026-03-03T13:29:26Z
- **Tasks:** 2 (Task 1 was pre-committed in `9b56f29`; Task 2 committed in `cc79d5d`)
- **Files modified:** 4

## Accomplishments

- color.ts: `auditFills` + `auditStrokes` — checks fillStyleId/strokeStyleId against styleIds set, skips figma.mixed and non-SOLID paints, flags unbound SOLID paints using rgbToHex
- typography.ts: `auditTypography` — guards textStyleId lookup, guards figma.mixed on fontSize and fontWeight before String() conversion, skips fontWeight check when fontSize is bound
- spacing.ts: `auditSpacing` — only runs on auto-layout nodes (layoutMode !== 'NONE'), skips zero values, checks boundVariables per spacing field
- components.ts: `auditComponents` — FRAME/GROUP type gate, name-match against componentNames set, excludes INSTANCE and COMPONENT node types

## Task Commits

Each task was committed atomically:

1. **Task 1: Color and typography auditors** - `9b56f29` (feat)
2. **Task 2: Spacing and component auditors** - `cc79d5d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/plugin/src/sandbox/audit/color.ts` - auditFills and auditStrokes pure functions
- `packages/plugin/src/sandbox/audit/typography.ts` - auditTypography pure function for TextNode
- `packages/plugin/src/sandbox/audit/spacing.ts` - auditSpacing pure function for auto-layout nodes
- `packages/plugin/src/sandbox/audit/components.ts` - auditComponents pure function with FRAME/GROUP name-match

## Decisions Made

- `auditComponents` uses `node.type !== 'FRAME' && node.type !== 'GROUP'` early return — INSTANCE nodes are already connected by definition; COMPONENT nodes are the canonical source
- `auditSpacing` skips `value === 0` — zero padding is a valid intentional spacing choice, not a missing design token
- `auditFills` and `auditStrokes` check `fillStyleId`/`strokeStyleId` against the `styleIds` Set first — if a named paint style is applied, all colors within are intentional
- `auditTypography` gates fontWeight reporting on fontSize also being unbound — prevents noisy duplicate issues when nodes are partially tokenized

## Deviations from Plan

None - plan executed exactly as written. Both auditor files match the specification precisely including all edge-case guards.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four category auditors are ready to be composed by the orchestrator in 02-03
- Each auditor is independently testable (pure functions, no Figma runtime required for unit tests)
- The `(node, pageName, lookupSet) => AuditIssue[]` pattern is consistent across all four auditors

---
*Phase: 02-audit-engine*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: packages/plugin/src/sandbox/audit/color.ts
- FOUND: packages/plugin/src/sandbox/audit/typography.ts
- FOUND: packages/plugin/src/sandbox/audit/spacing.ts
- FOUND: packages/plugin/src/sandbox/audit/components.ts
- FOUND: .planning/phases/02-audit-engine/02-02-SUMMARY.md
- FOUND commit: 9b56f29 (Task 1 — color and typography auditors)
- FOUND commit: cc79d5d (Task 2 — spacing and component auditors)
- npm run type-check: exits 0, zero errors
