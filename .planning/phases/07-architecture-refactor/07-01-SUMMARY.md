---
phase: 07-architecture-refactor
plan: "01"
subsystem: audit
tags: [typescript, figma-plugin, interfaces, testability, vitest]

# Dependency graph
requires: []
provides:
  - AuditNode, AuditNodeFills, AuditNodeText, AuditNodeLayout interfaces in audit/inputs.ts
  - All 6 auditors (color, typography, spacing, components, border, effects) accept plain-object AuditNode* interfaces instead of Figma SceneNode types
  - audit/index.ts is the sole Figma-type gateway — casts SceneNode to AuditNode* before auditor calls
affects:
  - 07-02 (serialize.ts extraction — follows same zero-Figma-import pattern)
  - 07-03 (MCP adapter — pure transform pattern)
  - any future Vitest test suite for audit modules

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AuditNode* interface gateway: orchestrator casts Figma types, auditors accept plain objects"
    - "Zero Figma type imports in auditor modules: figma.* runtime globals are fine (ambient), import type from @figma is not"
    - "Structural intersection casts for in-node property guards: node as AuditNode & { cornerRadius: ... }"

key-files:
  created:
    - packages/plugin/src/sandbox/audit/inputs.ts
  modified:
    - packages/plugin/src/sandbox/audit/index.ts
    - packages/plugin/src/sandbox/audit/color.ts
    - packages/plugin/src/sandbox/audit/typography.ts
    - packages/plugin/src/sandbox/audit/spacing.ts
    - packages/plugin/src/sandbox/audit/components.ts
    - packages/plugin/src/sandbox/audit/border.ts
    - packages/plugin/src/sandbox/audit/effects.ts

key-decisions:
  - "AuditNode* interfaces use symbol for figma.mixed fields (number | symbol) enabling type-safe test simulation without Figma runtime"
  - "index.ts uses as unknown as AuditNode* double-cast because SceneNode and AuditNode* are structurally incompatible in strict TypeScript"
  - "border.ts uses AuditNode & { cornerRadius: number | symbol; ... } intersection cast instead of FrameNode to remain Figma-type-free"
  - "Template literals with number | symbol types wrapped in String() to satisfy TS2731 implicit-symbol-to-string error"

patterns-established:
  - "Auditor modules: only import from ./inputs and ./utils — zero Figma type imports"
  - "index.ts orchestrator: retains all Figma globals, casts to AuditNode* before each auditor call"
  - "figma.mixed comparisons remain as-is in auditors — figma is an ambient global in Figma sandbox, not an import"

requirements-completed: [ARCH-01]

# Metrics
duration: 3min
completed: 2026-03-10
---

# Phase 7 Plan 01: Audit Inputs Interfaces Summary

**AuditNode* plain-object interface contracts defined in audit/inputs.ts, enabling all 6 auditors to run in Vitest (Node) without Figma runtime**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-10T00:03:53Z
- **Completed:** 2026-03-10T00:06:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `audit/inputs.ts` with 4 exported interfaces (AuditNode, AuditNodeFills, AuditNodeText, AuditNodeLayout) — zero Figma imports
- Updated `audit/index.ts` to import AuditNode* and cast SceneNode before every auditor call — index.ts remains the only Figma-type gateway
- Updated all 6 auditors to accept AuditNode* interfaces — removed all Figma-specific parameter types (SceneNode, TextNode, FrameNode, etc.)
- Type-check (`npx tsc --noEmit -p packages/plugin/tsconfig.sandbox.json`) passes with zero errors
- Build (`npm run build`) passes, dist/code.js (9.44 kB) and ui.html produced

## Task Commits

Each task was committed atomically:

1. **Task 1: Create audit/inputs.ts and update audit/index.ts cast layer** - `1d71ba2` (feat)
2. **Task 2: Update all 6 auditors to accept AuditNode* interfaces** - `9a9dfb8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/plugin/src/sandbox/audit/inputs.ts` - New: AuditNode, AuditNodeFills, AuditNodeText, AuditNodeLayout interfaces (zero Figma imports)
- `packages/plugin/src/sandbox/audit/index.ts` - Updated: imports from ./inputs, casts node to AuditNode* before each auditor call
- `packages/plugin/src/sandbox/audit/color.ts` - Updated: auditFills/auditStrokes accept AuditNodeFills (was SceneNode)
- `packages/plugin/src/sandbox/audit/typography.ts` - Updated: auditTypography accepts AuditNodeText (was TextNode)
- `packages/plugin/src/sandbox/audit/spacing.ts` - Updated: auditSpacing accepts AuditNodeLayout (was FrameNode|ComponentNode|InstanceNode)
- `packages/plugin/src/sandbox/audit/components.ts` - Updated: auditComponents accepts AuditNode (was SceneNode)
- `packages/plugin/src/sandbox/audit/border.ts` - Updated: auditBorderShape accepts AuditNode with structural intersection cast (was SceneNode)
- `packages/plugin/src/sandbox/audit/effects.ts` - Updated: auditEffects accepts AuditNode with structural intersection cast (was SceneNode)

## Decisions Made

- Used `as unknown as AuditNode*` double-cast in index.ts because SceneNode and AuditNode* are structurally incompatible in strict TypeScript (SceneNode has 141+ more properties); the plan permitted this pattern
- border.ts and effects.ts use local anonymous intersection types (`AuditNode & { cornerRadius: number | symbol; ... }`) for property guards — fully self-contained, zero Figma imports
- `figma.mixed` comparisons in auditors remain as-is — `figma` is an ambient global in the Figma sandbox (not imported), so it is acceptable by the zero-Figma-TYPE-IMPORT constraint
- Template literals using `number | symbol` types required `String(cr)` / `String(sw)` wrapping to satisfy TS2731

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2731 implicit symbol-to-string conversion in border.ts**
- **Found during:** Task 2 (Update border.ts)
- **Issue:** `${cr}px` and `${sw}px` in template literals with `number | symbol` type caused TS2731 error — implicit conversion of a symbol to string fails at runtime
- **Fix:** Wrapped in `String(cr)` and `String(sw)` — safe because the preceding `cr !== figma.mixed` guard ensures numeric type at runtime
- **Files modified:** `packages/plugin/src/sandbox/audit/border.ts`
- **Verification:** `npx tsc --noEmit -p packages/plugin/tsconfig.sandbox.json` zero errors after fix
- **Committed in:** `9a9dfb8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** The fix is necessary for correctness — the type union `number | symbol` in the AuditNode* interface correctly required explicit string conversion. No scope creep.

## Issues Encountered

- `color.ts` originally used `fill as SolidPaint` cast — removed by accessing `fill.color` and `fill.boundVariables` directly from the AuditNodeFills-typed fill shape, which is structurally equivalent
- `typography.ts` `textStyleId as string` cast replaced by explicit `typeof textStyleId === 'string'` guard for cleaner type narrowing

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ARCH-01 complete: all 6 auditors are now independently testable in Vitest (Node environment, no Figma runtime required)
- Ready for Plan 07-02: extracting `serializeReport()` to `serialize.ts` following the same zero-Figma-import pattern
- `audit/inputs.ts` provides the stable interface layer that test files will import

## Self-Check: PASSED

- FOUND: packages/plugin/src/sandbox/audit/inputs.ts
- FOUND: packages/plugin/src/sandbox/audit/index.ts (updated)
- FOUND: all 6 auditor files (color, typography, spacing, components, border, effects)
- FOUND: .planning/phases/07-architecture-refactor/07-01-SUMMARY.md
- FOUND: commit 1d71ba2 (Task 1)
- FOUND: commit 9a9dfb8 (Task 2)
- FOUND: packages/plugin/dist/code.js (build artifact)

---
*Phase: 07-architecture-refactor*
*Completed: 2026-03-10*
