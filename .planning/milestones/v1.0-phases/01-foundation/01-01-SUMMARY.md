---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [typescript, eslint, prettier, vitest, npm-workspaces, monorepo]

# Dependency graph
requires: []
provides:
  - npm workspaces monorepo with packages/shared, packages/plugin, packages/mcp-server
  - packages/shared barrel export: schemaVersion, AuditReport, AuditIssue, DesignToken, ComponentSpec, AuditMeta, SandboxMessage, UIMessage, CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES
  - tsconfig.base.json with strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
  - eslint.config.ts flat config with typescript-eslint v8 + prettier integration
  - vitest.config.ts workspace test runner (projects API)
affects: [02-plugin-scaffold, 03-audit-engine, 04-mcp-server, 05-integration]

# Tech tracking
tech-stack:
  added:
    - typescript@5.9.3
    - prettier@3.8.1
    - eslint@10.0.2
    - typescript-eslint@8.56.1
    - vitest@4.0.18
    - jiti (required by ESLint 10 for TypeScript config loading)
    - "@types/node (required by mcp-server for process global)"
  patterns:
    - "npm workspaces monorepo — all packages under packages/"
    - "TypeScript project references — root tsconfig.json references all packages"
    - "Discriminated union message protocol — type field on every message"
    - "Barrel-first exports — schemaVersion is first export as forward-compatibility anchor"
    - "Flat ESLint config (v10) with TypeScript-ESLint v8 API"
    - "no-console: error in mcp-server — use process.stderr.write instead"

key-files:
  created:
    - package.json
    - tsconfig.base.json
    - tsconfig.json
    - eslint.config.ts
    - .prettierrc
    - .gitignore
    - vitest.config.ts
    - packages/shared/src/index.ts
    - packages/shared/src/types.ts
    - packages/shared/src/messages.ts
    - packages/shared/src/constants.ts
    - packages/shared/tsconfig.json
    - packages/shared/vitest.config.ts
    - packages/plugin/package.json
    - packages/plugin/tsconfig.json
    - packages/plugin/src/index.ts
    - packages/mcp-server/package.json
    - packages/mcp-server/tsconfig.json
    - packages/mcp-server/src/index.ts
    - packages/mcp-server/eslint.config.ts
  modified: []

key-decisions:
  - "Used typescript-eslint unified package v8.56.1 for flat config API (tseslint.config())"
  - "Added jiti as dev dependency — ESLint 10 requires it to load TypeScript config files"
  - "Added @types/node to root dev dependencies — mcp-server uses process.stderr.write"
  - "Created packages/plugin/tsconfig.json stub — root project references require it to exist"
  - "Created packages/plugin/src/index.ts stub — composite tsconfig requires at least one source file"
  - "Added packages/shared/vitest.config.ts — required for projects array to discover package"
  - "Added shared index.test.ts — vitest exits 1 with no test files; 2 tests validate schemaVersion and constants"
  - "Added .claude/** and .planning/** to ESLint ignores — prevent linting gsd-tools .cjs files"
  - "moduleResolution: bundler in tsconfig.base.json — correct for Vite consumers; mcp-server will add Node-specific resolution in Phase 4"

patterns-established:
  - "Discriminated union messages: all messages have `type: string literal` field"
  - "Barrel-first: schemaVersion exported first from index.ts as forward-compatibility anchor"
  - "MCP server stdout safety: process.stderr.write only, never console.* (stdio transport)"
  - "Strict TypeScript: strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes across all packages"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07]

# Metrics
duration: 8min
completed: 2026-03-03
---

# Phase 1 Plan 01: Monorepo Scaffold and Shared Types Summary

**npm workspaces monorepo with TypeScript strict toolchain, eslint/prettier/vitest configured, and packages/shared exporting complete AuditReport type hierarchy and discriminated union message protocol**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-02T23:35:36Z
- **Completed:** 2026-03-03T00:40:00Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Root monorepo with npm workspaces, TypeScript project references, ESLint flat config (v10), Prettier, and Vitest 4.x workspace test runner
- packages/shared fully implemented: AuditReport, AuditIssue, DesignToken, ComponentSpec, AuditMeta types + SandboxMessage/UIMessage discriminated unions + chunking constants
- All three workspace packages symlinked (shared, plugin, mcp-server); shared built to dist/ with .d.ts declarations
- All checks green: type-check exits 0, lint exits 0, test exits 0 (4 tests passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Monorepo root scaffold and tooling installation** - `0c85ce4` (chore)
2. **Task 2: packages/shared — types, messages, constants, and build config** - `428b8e7` (feat)

**Plan metadata:** (docs commit — created after SUMMARY.md)

## Files Created/Modified

- `package.json` — root monorepo: workspaces, scripts (build/dev/lint/type-check/test)
- `tsconfig.base.json` — strict TypeScript base: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
- `tsconfig.json` — root project references: shared, plugin, mcp-server
- `eslint.config.ts` — ESLint flat config v10 with typescript-eslint v8 + prettier
- `.prettierrc` — singleQuote, tabWidth 2, printWidth 100, trailingComma es5
- `.gitignore` — node_modules, dist, tsbuildinfo, env files
- `vitest.config.ts` — Vitest 4.x root config with `test.projects: ['packages/*']`
- `packages/shared/src/types.ts` — AuditReport, AuditIssue, DesignToken, ComponentSpec, AuditMeta interfaces
- `packages/shared/src/messages.ts` — SandboxMessage, UIMessage discriminated unions (8 message types)
- `packages/shared/src/constants.ts` — CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES
- `packages/shared/src/index.ts` — barrel: schemaVersion first, then all types/messages/constants
- `packages/shared/src/index.test.ts` — 2 tests: schemaVersion value, chunking constants values
- `packages/shared/tsconfig.json` — composite: true, outDir: dist
- `packages/shared/vitest.config.ts` — required for projects array discovery
- `packages/plugin/package.json` — stub: @ai-ds-auditor/shared dependency
- `packages/plugin/tsconfig.json` — stub: composite tsconfig (required by project references)
- `packages/plugin/src/index.ts` — stub: re-exports types from shared
- `packages/mcp-server/package.json` — stub: @ai-ds-auditor/shared dependency, dev/build/lint scripts
- `packages/mcp-server/tsconfig.json` — extends base, references shared, types: [node]
- `packages/mcp-server/src/index.ts` — stub: uses process.stderr.write (not console.error)
- `packages/mcp-server/eslint.config.ts` — extends root, adds no-console: error

## Decisions Made

- Used `typescript-eslint` unified package v8 for `tseslint.config()` flat config API
- Added `jiti` dev dependency — required by ESLint 10 for TypeScript config files
- Added `@types/node` dev dependency — mcp-server stub uses `process.stderr.write`
- Created plugin tsconfig.json and src/index.ts stubs — required by TypeScript project references (composite: true needs source files)
- Added shared `vitest.config.ts` — required for Vitest 4 projects array to discover the package
- Added `index.test.ts` in shared — Vitest exits 1 with no test files; minimal tests validate exported constants
- Added `.claude/**` and `.planning/**` to ESLint ignores — gsd-tools .cjs files would cause lint errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added jiti dependency for ESLint TypeScript config loading**
- **Found during:** Task 2 (lint verification)
- **Issue:** ESLint 10 requires `jiti` library to load `eslint.config.ts` files — install absent from plan
- **Fix:** `npm install --save-dev jiti`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run lint` exits 0 after installation
- **Committed in:** 428b8e7 (Task 2 commit)

**2. [Rule 3 - Blocking] Added @types/node for mcp-server process global**
- **Found during:** Task 2 (type-check)
- **Issue:** `process` not typed without @types/node; mcp-server src/index.ts uses process.stderr.write
- **Fix:** `npm install --save-dev @types/node` + `"types": ["node"]` in mcp-server tsconfig.json
- **Files modified:** package.json, package-lock.json, packages/mcp-server/tsconfig.json
- **Verification:** `npm run type-check` exits 0
- **Committed in:** 428b8e7 (Task 2 commit)

**3. [Rule 3 - Blocking] Created packages/plugin/tsconfig.json stub**
- **Found during:** Task 2 (type-check)
- **Issue:** Root tsconfig.json references `packages/plugin` but no tsconfig.json existed — TS error TS5083
- **Fix:** Created minimal composite tsconfig.json for plugin package
- **Files modified:** packages/plugin/tsconfig.json
- **Verification:** `npm run type-check` exits 0
- **Committed in:** 428b8e7 (Task 2 commit)

**4. [Rule 3 - Blocking] Created packages/plugin/src/index.ts stub**
- **Found during:** Task 2 (type-check)
- **Issue:** plugin tsconfig.json with composite:true and `include: ["src/**/*"]` requires at least one source file — TS error TS18003
- **Fix:** Created stub index.ts that re-exports types from @ai-ds-auditor/shared
- **Files modified:** packages/plugin/src/index.ts
- **Verification:** `npm run type-check` exits 0
- **Committed in:** 428b8e7 (Task 2 commit)

**5. [Rule 3 - Blocking] Added packages/shared/vitest.config.ts**
- **Found during:** Task 2 (test verification)
- **Issue:** Vitest 4 `projects: ['packages/*']` requires a vitest.config.ts in each package directory to be discovered
- **Fix:** Created minimal vitest.config.ts in packages/shared
- **Files modified:** packages/shared/vitest.config.ts
- **Verification:** `npm run test` exits 0, shared tests discovered and run
- **Committed in:** 428b8e7 (Task 2 commit)

**6. [Rule 2 - Missing Critical] Added packages/shared/src/index.test.ts**
- **Found during:** Task 2 (test verification)
- **Issue:** Vitest exits with code 1 when no test files found — plan success criterion "npm run test exits 0" fails
- **Fix:** Created minimal test suite validating schemaVersion constant and chunking constants
- **Files modified:** packages/shared/src/index.test.ts
- **Verification:** `npm run test` exits 0, 4 tests pass
- **Committed in:** 428b8e7 (Task 2 commit)

**7. [Rule 1 - Bug] Added .claude/** and .planning/** to ESLint ignores**
- **Found during:** Task 2 (lint verification)
- **Issue:** ESLint scanned .claude/get-shit-done/bin/*.cjs files which use CJS require() — hundreds of lint errors
- **Fix:** Added `'.claude/**'` and `'.planning/**'` to the ignores array in eslint.config.ts
- **Files modified:** eslint.config.ts
- **Verification:** `npm run lint` exits 0
- **Committed in:** 428b8e7 (Task 2 commit)

---

**Total deviations:** 7 auto-fixed (4 blocking, 2 missing critical, 1 bug)
**Impact on plan:** All auto-fixes were necessary for correctness. The plan specified the goal state but omitted several prerequisite steps (jiti, @types/node, plugin stub files, vitest config, test file, eslint ignores). No scope creep — all fixes are minimal and directly required.

## Issues Encountered

- ESLint 10 flat config with TypeScript requires `jiti` package — not documented in plan's install list
- TypeScript project references require all referenced packages to have composite tsconfigs with at least one source file
- Vitest 4 `projects` array requires individual `vitest.config.ts` per package (not just package.json)
- Vitest exits code 1 with no tests — success criterion requires at least one test file

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Monorepo structure complete; all workspace symlinks resolving correctly
- packages/shared built and dist/ contains full .d.ts declarations for all types
- Type-check, lint, and test all pass — clean baseline for Phase 1 Plan 02 (plugin scaffold)
- Concern: `moduleResolution: bundler` in tsconfig.base.json — mcp-server in Phase 4 will need Node-compatible module resolution; the base setting is fine for now since mcp-server isn't built yet

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
