---
phase: 02-audit-engine
plan: 01
subsystem: testing
tags: [vitest, typescript, audit, pure-functions, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: shared types (AuditIssue, AuditReport, ComponentSpec, DesignToken), schemaVersion constant, plugin package scaffold
provides:
  - rgbToHex: converts Figma RGB 0-1 floats to CSS hex strings
  - buildIssueId: deterministic issue ID generator
  - buildIssue: typed AuditIssue factory function
  - assembleReport: typed AuditReport assembler with computed summary fields
  - vitest config for plugin package with @shared alias
  - 20-test suite covering all pure helper functions
affects:
  - 02-02 (color auditor will call rgbToHex + buildIssue)
  - 02-03 (typography auditor will call buildIssue + assembleReport)
  - 02-04 (spacing auditor will call buildIssue)
  - 02-05 (component auditor will call buildIssue + assembleReport)
  - all downstream auditors depend on this contract

# Tech tracking
tech-stack:
  added: [vitest (config added for plugin package)]
  patterns:
    - TDD RED-GREEN with per-phase commit protocol
    - Pure helper functions with no Figma API dependencies for testability
    - Math.round channel conversion for Figma RGB-to-hex
    - healthScore = Math.max(0, 100 - totalIssues)

key-files:
  created:
    - packages/plugin/src/sandbox/audit/utils.ts
    - packages/plugin/src/sandbox/audit/utils.test.ts
    - packages/plugin/vitest.config.ts
  modified: []

key-decisions:
  - "RGB-to-hex uses inline { r, g, b } type instead of @figma/plugin-typings RGB so utils can be tested without Figma runtime"
  - "Plan had a typo in hex example (#804bbf vs mathematically correct #8040bf for input 0.251) — implemented Math.round correctly and fixed test to match"
  - "vitest.config.ts placed at packages/plugin/ root with @shared alias pointing to ../shared/src for test resolution"

patterns-established:
  - "Pure function pattern: all audit helpers in utils.ts have zero Figma API imports — import only from @shared and built-in JS"
  - "TDD protocol: RED commit (failing tests) then GREEN commit (implementation) then final docs commit"
  - "assembleReport uses issuesByCategory accumulator loop instead of filter-per-category for O(n) performance"

requirements-completed: [AUDIT-06, AUDIT-07, AUDIT-09]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 02 Plan 01: Audit Engine Pure Helpers Summary

**Four pure helper functions (rgbToHex, buildIssueId, buildIssue, assembleReport) TDD-verified with 20 vitest tests, zero Figma API dependencies, full TypeScript strict compliance**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T09:25:28Z
- **Completed:** 2026-03-03T09:27:30Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 3 created

## Accomplishments

- Created vitest.config.ts for plugin package with @shared path alias, enabling Node-based unit tests for sandbox code
- Wrote 20 failing tests covering all four pure helper functions (RED phase)
- Implemented utils.ts with rgbToHex, buildIssueId, buildIssue, assembleReport — all 20 tests pass (GREEN phase)
- npm run type-check exits 0 with zero TypeScript errors across all packages
- Full workspace test suite: 24 tests pass (20 new + 4 existing shared tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests + vitest config** - `b613d0a` (test)
2. **Task 2: GREEN — utils.ts implementation** - `061491e` (feat)

_Note: TDD plan — RED commit precedes GREEN commit per TDD protocol._

## Files Created/Modified

- `packages/plugin/vitest.config.ts` - Vitest config with @shared alias for plugin package tests
- `packages/plugin/src/sandbox/audit/utils.test.ts` - 20-test suite covering rgbToHex, buildIssueId, buildIssue, assembleReport
- `packages/plugin/src/sandbox/audit/utils.ts` - Pure helper functions with zero Figma API imports

## Decisions Made

- Used inline `{ r: number; g: number; b: number }` type for rgbToHex parameter instead of importing `RGB` from `@figma/plugin-typings` so the function can be called from tests without a Figma runtime
- Plan frontmatter had a typo: listed `#804bbf` as the expected hex for `{ r: 0.502, g: 0.251, b: 0.749 }` but the annotation correctly computed 0.251*255=64.005→64=0x40. The mathematically correct output is `#8040bf`. Implementation uses Math.round per spec; test corrected to `#8040bf`
- vitest.config.ts uses `fileURLToPath(import.meta.url)` pattern (same as vite.config.sandbox.ts) for ESM-compatible `__dirname`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected hex test case from plan typo (#804bbf → #8040bf)**
- **Found during:** Task 1 (writing RED tests)
- **Issue:** Plan listed `#804bbf` as expected output for `rgbToHex({ r: 0.502, g: 0.251, b: 0.749 })` but the plan's own annotation showed 0.251*255=64=0x40, making `#8040bf` the correct answer. `#804bbf` would require g=0x4b=75 which is ~0.294, not 0.251.
- **Fix:** Test written with `#8040bf`; implementation uses Math.round as specified; test passes
- **Files modified:** packages/plugin/src/sandbox/audit/utils.test.ts
- **Verification:** Test passes with correct implementation — Math.round(0.251*255)=64=0x40
- **Committed in:** b613d0a (Task 1 RED commit, then corrected before GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: plan typo in test expectation)
**Impact on plan:** Required fixing an incorrect expected value in the plan. Implementation behavior is correct per spec (Math.round). No scope creep.

## Issues Encountered

None — plan executed smoothly. All four functions implemented in a single pass; all 20 tests passed on first GREEN run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four pure helper functions are stable and typed: downstream auditors (color, typography, spacing, component) can import from `./utils`
- vitest infrastructure in place for plugin package — future test files will run automatically
- No blockers for Phase 02 Plan 02 (color auditor)

---
*Phase: 02-audit-engine*
*Completed: 2026-03-03*
