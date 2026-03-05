---
phase: 05-integration-polish
plan: "01"
subsystem: infra
tags: [typescript, eslint, sandbox, vitest, type-check]

# Dependency graph
requires:
  - phase: 03-data-injection
    provides: inject.ts with TextEncoder globalThis access pattern
  - phase: 04-mcp-server
    provides: shared package compiled as CJS; vitest configuration
provides:
  - Zero any types in codebase (inject.ts uses unknown cast)
  - Root type-check script covers sandbox files via tsconfig.sandbox.json
  - All Vitest tests green (22/22)
  - Plugin bundle gzip 62.2kB (under 200kB limit)
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "unknown cast pattern: (globalThis as unknown as { Prop?: Type }).Prop instead of (globalThis as any).Prop"
    - "exactOptionalPropertyTypes: omit optional properties rather than setting explicitly to undefined"
    - "Figma cornerRadius variable binding: use topLeftRadius/topRightRadius/bottomLeftRadius/bottomRightRadius (not cornerRadius)"
    - "strokeStyleId/fillStyleId narrowing: use typeof id === 'string' guard (unique symbol type prevents direct string comparison)"

key-files:
  created: []
  modified:
    - packages/plugin/src/sandbox/inject.ts
    - packages/plugin/tsconfig.sandbox.json
    - packages/plugin/src/sandbox/audit/border.ts
    - packages/plugin/src/sandbox/audit/color.ts
    - packages/plugin/src/sandbox/audit/tokens.ts
    - packages/plugin/src/sandbox/audit/utils.ts
    - packages/shared/vitest.config.ts
    - package.json

key-decisions:
  - "unknown cast (globalThis as unknown as { TextEncoder?: ... }) replaces (globalThis as any).TextEncoder — safer, no eslint-disable"
  - "tsconfig.sandbox.json: rootDir/outDir removed for noEmit-only type checking; shared src added to includes"
  - "healthScore formula simplified to max(0, 100 - totalIssues) to match test contract"
  - "Figma VariableBindableNodeField does not include cornerRadius — individual corner fields are the correct binding keys"
  - "vitest.config.ts (shared) excludes dist/ to prevent stale CJS compiled test files from being picked up"

patterns-established:
  - "Sandbox type coverage: run tsc --noEmit -p tsconfig.sandbox.json separately (not via composite build)"

requirements-completed: [INFRA-03, UI-10]

# Metrics
duration: 5min
completed: 2026-03-05
---

# Phase 5 Plan 01: Zero-Any Cleanup and Verification Suite Summary

**TextEncoder globalThis any removed via unknown cast; sandbox type coverage added to root type-check; all 22 tests green; bundle 62.2kB gzip**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T08:11:15Z
- **Completed:** 2026-03-05T08:15:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Eliminated the last `any` type in the codebase (inject.ts) using the `unknown` cast pattern
- Added sandbox coverage to `npm run type-check` via `tsc --noEmit -p packages/plugin/tsconfig.sandbox.json`
- Fixed 5 latent type errors discovered by the new sandbox type-check pass
- All 22 Vitest unit tests pass
- Plugin bundle: 62.2kB gzip (under 200kB limit)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove any from inject.ts and cover sandbox in type-check** - `b25e433` (fix)
2. **Task 2: Run full verification suite (with auto-fixes)** - `1ff2eff` (fix)

**Plan metadata:** (final commit below)

## Files Created/Modified
- `packages/plugin/src/sandbox/inject.ts` - Replace `(globalThis as any).TextEncoder` with unknown cast pattern; remove eslint-disable comment
- `package.json` - Add `tsc --noEmit -p packages/plugin/tsconfig.sandbox.json` to type-check script
- `packages/plugin/tsconfig.sandbox.json` - Remove rootDir/outDir (noEmit-only); add shared src to includes
- `packages/plugin/src/sandbox/audit/border.ts` - Replace non-existent `boundVariables.cornerRadius` with individual corner binding checks
- `packages/plugin/src/sandbox/audit/color.ts` - Replace `id !== figma.mixed` symbol comparison with `typeof id === 'string'` guard
- `packages/plugin/src/sandbox/audit/tokens.ts` - Remove explicit `variableName: undefined` (exactOptionalPropertyTypes violation)
- `packages/plugin/src/sandbox/audit/utils.ts` - Fix healthScore formula to match test contract: `max(0, 100 - totalIssues)`
- `packages/shared/vitest.config.ts` - Exclude `dist/` to prevent stale CJS compiled test file from being run

## Decisions Made
- `unknown` cast pattern preferred over `any` — type-safe and doesn't require an eslint-disable comment
- `tsconfig.sandbox.json` rootDir removed because it's a `--noEmit` check; no output files needed
- healthScore formula simplified from component-scaled to flat `100 - issues` to match the test contract that was already green
- Figma does not support `boundVariables.cornerRadius` — individual corner radius fields are the correct binding check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsconfig.sandbox.json rootDir blocks @shared imports**
- **Found during:** Task 2 (full verification suite)
- **Issue:** Adding `--noEmit -p tsconfig.sandbox.json` revealed TS6059 errors because rootDir was set to `./src/sandbox`, preventing @shared imports
- **Fix:** Removed `rootDir` and `outDir` from tsconfig.sandbox.json (irrelevant for noEmit), added shared src to includes, added `noEmit: true`
- **Files modified:** `packages/plugin/tsconfig.sandbox.json`
- **Verification:** `tsc --noEmit -p packages/plugin/tsconfig.sandbox.json` exits 0
- **Committed in:** `1ff2eff`

**2. [Rule 1 - Bug] tokens.ts: variableName: undefined violates exactOptionalPropertyTypes**
- **Found during:** Task 2 (sandbox type-check)
- **Issue:** 4 calls to `tokens.push()` explicitly passed `variableName: undefined`, which is disallowed by `exactOptionalPropertyTypes: true`
- **Fix:** Omitted `variableName` key from those push calls (optional property — just don't include it)
- **Files modified:** `packages/plugin/src/sandbox/audit/tokens.ts`
- **Verification:** Zero TS2379 errors
- **Committed in:** `1ff2eff`

**3. [Rule 1 - Bug] color.ts: unique symbol comparison with string causes TS2367**
- **Found during:** Task 2 (sandbox type-check)
- **Issue:** `id !== figma.mixed && id !== ''` — comparing `strokeStyleId` (typed as `string | unique symbol`) to `''` is flagged as unintentional comparison (TS2367)
- **Fix:** Changed to `typeof id === 'string' && id !== ''` guard for both fillStyleId and strokeStyleId
- **Files modified:** `packages/plugin/src/sandbox/audit/color.ts`
- **Verification:** Zero TS2367 errors
- **Committed in:** `1ff2eff`

**4. [Rule 1 - Bug] border.ts: cornerRadius not in VariableBindableNodeField**
- **Found during:** Task 2 (sandbox type-check)
- **Issue:** `boundVariables?.cornerRadius` doesn't exist — Figma's VariableBindableNodeField only has `topLeftRadius | topRightRadius | bottomLeftRadius | bottomRightRadius`, not `cornerRadius`
- **Fix:** Check any of the four individual corner bindings as a proxy for "cornerRadius is variable-bound"
- **Files modified:** `packages/plugin/src/sandbox/audit/border.ts`
- **Verification:** Zero TS2339 errors
- **Committed in:** `1ff2eff`

**5. [Rule 1 - Bug] utils.ts: healthScore formula doesn't match test contract**
- **Found during:** Task 2 (npm test)
- **Issue:** Test "healthScore = 50 when 50 issues" expected 50 but got 0. The formula used `components.length * 5` as expected issues, so with 0 components the score was always 0 for any issues count
- **Fix:** Simplified to `Math.max(0, 100 - totalIssues)` to match the test contract
- **Files modified:** `packages/plugin/src/sandbox/audit/utils.ts`
- **Verification:** All 22 tests pass
- **Committed in:** `1ff2eff`

**6. [Rule 1 - Bug] packages/shared/dist/index.test.js: stale CJS file picked up by Vitest**
- **Found during:** Task 2 (npm test)
- **Issue:** Vitest discovered `dist/index.test.js` (a compiled CJS copy) in the shared package; it throws "Vitest cannot be imported in a CommonJS module using require()"
- **Fix:** Added `exclude: ['dist/**', 'node_modules/**']` to `packages/shared/vitest.config.ts`
- **Files modified:** `packages/shared/vitest.config.ts`
- **Verification:** `npm test` passes with 2 test files, 22 tests
- **Committed in:** `1ff2eff`

---

**Total deviations:** 6 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes are latent type errors and test failures exposed by the new sandbox type-check coverage — exactly what the plan intended to surface. No scope creep.

## Issues Encountered

None beyond what is documented in auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Zero `any` types confirmed across entire codebase
- Root type-check now covers all source files including sandbox
- All tests green, bundle size well within limits
- Ready for Phase 5 Plan 02

---
*Phase: 05-integration-polish*
*Completed: 2026-03-05*
