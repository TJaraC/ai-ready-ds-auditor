---
phase: 07-architecture-refactor
plan: "03"
subsystem: api
tags: [vitest, typescript, mcp-server, adapter-pattern, chunk-reader, testing]

# Dependency graph
requires:
  - phase: 07-architecture-refactor
    provides: shared types (AuditReport, ComponentSpec, DesignToken, AuditMeta) and constants (META_KEY, CHUNK_KEY_PREFIX, schemaVersion)
provides:
  - adapter.ts with adaptAuditSummary(), adaptComponentSpec(), adaptDesignTokens() pure transforms (zero MCP SDK imports)
  - chunk-reader.ts refactored with assembleChunks() + parseReport() split, reconstructReport() backward-compatible wrapper
  - vitest.config.ts for mcp-server package with @ai-ds-auditor/shared path alias
  - 19 new tests (7 adapter + 12 chunk-reader) across 2 new test files
affects: [phase-11-adapter-wiring, mcp-server-tools, get-audit-summary, get-component-specs, get-design-tokens]

# Tech tracking
tech-stack:
  added: [vitest (mcp-server package now has its own vitest config)]
  patterns: [adapter-pattern, pure-function-extraction, tdd-red-green, backward-compatible-wrapper]

key-files:
  created:
    - packages/mcp-server/src/adapter.ts
    - packages/mcp-server/src/adapter.test.ts
    - packages/mcp-server/src/figma/chunk-reader.test.ts
    - packages/mcp-server/vitest.config.ts
  modified:
    - packages/mcp-server/src/figma/chunk-reader.ts

key-decisions:
  - "adapter.ts imports zero @modelcontextprotocol/sdk types — pure shared-type transforms only"
  - "reconstructReport() kept as backward-compatible wrapper calling assembleChunks() then parseReport()"
  - "vitest.config.ts uses @ai-ds-auditor/shared alias pointing to packages/shared/src (no pre-built dist required for tests)"
  - "Adapter wiring into tool files deferred to Phase 11 — additive change, no behavior risk now"

patterns-established:
  - "Adapter pattern: pure transform layer between shared types and MCP response shapes"
  - "Function extraction: monolithic function split into testable sub-functions with backward-compatible wrapper"
  - "TDD flow: RED test file created first, GREEN implementation second, zero TypeScript errors third"

requirements-completed: [ARCH-03, ARCH-04]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 7 Plan 03: MCP Adapter Layer and Chunk-Reader Split Summary

**Pure MCP adapter layer (adaptAuditSummary/ComponentSpec/DesignTokens) and chunk-reader refactored into independently testable assembleChunks + parseReport functions with 19 new Vitest tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T11:44:01Z
- **Completed:** 2026-03-10T11:47:39Z
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- Created `adapter.ts` with 3 pure transform functions (adaptAuditSummary, adaptComponentSpec, adaptDesignTokens) and zero MCP SDK imports
- Split `chunk-reader.ts` monolith into `assembleChunks()` + `parseReport()` individually testable functions, keeping `reconstructReport()` as backward-compatible wrapper
- Added `vitest.config.ts` to mcp-server package — all 56 workspace tests now pass including 19 new mcp-server tests
- All TypeScript strict checks pass (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create adapter.ts with pure MCP transform functions and tests** - `e821076` (feat)
2. **Task 2: Split chunk-reader.ts and write chunk-reader.test.ts** - `94f5115` (feat)
3. **Task 3: Create mcp-server vitest config and verify full test suite** - `34c4219` (chore)

_Note: TDD tasks followed RED (failing tests first) then GREEN (passing implementation) flow._

## Files Created/Modified
- `packages/mcp-server/src/adapter.ts` - Pure transform functions with AuditSummaryResult shape, category filter logic
- `packages/mcp-server/src/adapter.test.ts` - 7 tests: no-filter, color-filter, empty-filter, empty-report, identity ComponentSpec, identity tokens, empty tokens
- `packages/mcp-server/src/figma/chunk-reader.ts` - Refactored: assembleChunks() + parseReport() extracted, reconstructReport() is now a wrapper
- `packages/mcp-server/src/figma/chunk-reader.test.ts` - 12 tests: missing meta, empty meta, missing chunk, single chunk, multi-chunk concat, fileKey on error, schema mismatch, SchemaVersionError fields, valid parse, all fields present, wrapper success, wrapper error
- `packages/mcp-server/vitest.config.ts` - Vitest config with @ai-ds-auditor/shared alias, environment: node, name: @ai-ds-auditor/mcp-server

## Decisions Made
- **Adapter wiring deferred**: The adapter functions are created and tested but NOT wired into tool files (get-audit-summary.ts etc). That is Phase 11 work — wiring now risks behavior regressions.
- **assembleChunks order**: Schema version check moved from assembleChunks to parseReport so chunk assembly is purely about data reconstruction, schema validation is purely about data integrity.
- **noUncheckedIndexedAccess fix**: Used non-null assertion `result.issues[0]!` in test since the preceding `toHaveLength(1)` assertion guarantees the element exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript strict error in adapter.test.ts**
- **Found during:** Task 2 (TypeScript compilation verification)
- **Issue:** `result.issues[0].category` flagged as "Object is possibly undefined" due to `noUncheckedIndexedAccess` in tsconfig.base.json
- **Fix:** Added non-null assertion `result.issues[0]!.category` — safe because preceding `toHaveLength(1)` assertion guarantees element exists
- **Files modified:** `packages/mcp-server/src/adapter.test.ts`
- **Verification:** `npx tsc --noEmit -p packages/mcp-server/tsconfig.json` exits with 0 errors
- **Committed in:** `94f5115` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript strict correctness)
**Impact on plan:** Minimal — single non-null assertion in test code. Required for zero-error TypeScript compilation under strict settings.

## Issues Encountered
- The vitest.config.ts needed to be created before the TDD RED phase so Vitest could discover the test files. This meant the vitest config was created as part of Task 1 setup rather than Task 3. The Task 3 commit captures the config file; the config was already in place during Tasks 1 and 2.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Adapter layer is ready for wiring in Phase 11 — all 3 adapter functions are tested and documented
- chunk-reader.ts callers (get-audit-summary.ts, get-component-specs.ts, get-design-tokens.ts) continue using `reconstructReport()` unchanged
- Full test suite (56 tests) passing, build clean

## Self-Check: PASSED

All 6 files exist. All 3 task commits verified. 56 tests passing. Build clean.

---
*Phase: 07-architecture-refactor*
*Completed: 2026-03-10*
