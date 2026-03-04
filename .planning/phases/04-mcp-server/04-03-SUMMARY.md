---
phase: 04-mcp-server
plan: "03"
subsystem: api
tags: [mcp, stdio, node, commonjs, figma, audit, entry-point]

requires:
  - phase: 04-01
    provides: DesignSystemCache, error classes, chunk-reader
  - phase: 04-02
    provides: registerGetDesignTokens, registerGetComponentSpecs, all formatters

provides:
  - registerGetAuditSummary(server, cache) — category-filtered audit issue list
  - createServer(cache) — McpServer with all three tools registered
  - index.ts entry point — env validation + DesignSystemCache + StdioServerTransport
  - dist/index.js — compiled runnable Node.js MCP server

affects: [05-distribution, ide-config]

tech-stack:
  added: []
  patterns: [env validation with process.exit on missing vars, CJS module output for Node.js runtime]

key-files:
  created:
    - packages/mcp-server/src/tools/get-audit-summary.ts
    - packages/mcp-server/src/server.ts
    - packages/mcp-server/src/index.ts (replaced Phase 1 stub)
  modified:
    - packages/mcp-server/package.json (type:commonjs, main, bin)
    - packages/mcp-server/tsconfig.json (module:CommonJS, moduleResolution:node)
    - packages/shared/tsconfig.json (module:CommonJS, moduleResolution:node)
    - packages/shared/package.json (added require condition to exports)

key-decisions:
  - "mcp-server compiled as CommonJS (not ESM) — shared dist was built with moduleResolution:bundler which omits .js extensions in re-exports; Node.js ESM requires them; CJS avoids this entirely"
  - "shared package also switched to CommonJS compile — needed for require() resolution in mcp-server CJS output"
  - "Plugin unaffected — Vite imports shared TypeScript source directly (not dist/)"
  - "bin field: ai-ds-auditor-mcp → dist/index.js for future npx usage"
  - "get_audit_summary returns totalIssues + filteredIssues counts alongside the issue array for quick LLM summarization"

patterns-established:
  - "CJS + moduleResolution:node for Node.js runtime packages in this monorepo"
  - "Entry point pattern: getRequiredEnv() exits with actionable message before any async work"

requirements-completed: [MCP-01, TOOL-03, TOOL-04, TOOL-05]

duration: 30min
completed: 2026-03-04
---

# Phase 04-03: Server Wiring + Entry Point Summary

**Fully wired MCP server compilable and runnable as a stdio process with all three design system tools**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-03-04
- **Tasks:** 2 (+ 1 human verification checkpoint pending)
- **Files created/modified:** 7

## Accomplishments
- `get_audit_summary` tool: category-filterable audit issue list with `totalIssues`/`filteredIssues` metadata
- `server.ts`: thin wiring layer — `createServer(cache)` registers all three tools
- `index.ts`: env validation + DesignSystemCache + StdioServerTransport.connect()
- `npm run build -w packages/mcp-server` → `dist/index.js` with zero TS errors
- Server starts cleanly with valid env vars; exits with clear actionable error when missing

## Task Commits

1. **Task 1: get-audit-summary + server.ts** - `2f259c4` (feat)
2. **Task 2: index.ts + package.json + CJS fix** - `a12d074` (feat)

## Files Created/Modified
- `packages/mcp-server/src/tools/get-audit-summary.ts` — TOOL-03 registration
- `packages/mcp-server/src/server.ts` — createServer() with all three tools
- `packages/mcp-server/src/index.ts` — entry point (replaces Phase 1 stub)
- `packages/mcp-server/package.json` — type:commonjs, main:dist/index.js, bin field
- `packages/mcp-server/tsconfig.json` — module:CommonJS, moduleResolution:node
- `packages/shared/tsconfig.json` — module:CommonJS, moduleResolution:node
- `packages/shared/package.json` — added "require" condition to exports map

## Decisions Made
- **CJS for mcp-server**: The shared package was compiled with `moduleResolution: bundler` which emits re-exports without `.js` extensions (`export * from './types'`). Node.js ESM resolver requires explicit extensions and fails. Switching to CommonJS makes `require()` handle extensionless imports transparently — no source changes needed anywhere.
- **Shared also CJS**: For the CJS require chain to work, shared's dist must be CJS-compatible. The plugin uses Vite which imports TypeScript source directly — unaffected by the dist format change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Blocking] ESM module resolution failure at runtime**
- **Found during:** Task 2 runtime verification
- **Issue:** `ERR_MODULE_NOT_FOUND` for `shared/dist/types` — shared was compiled as ESM without `.js` extensions in re-exports; Node.js ESM requires them
- **Fix:** Switched mcp-server to `module: CommonJS` + `moduleResolution: node`; also recompiled shared as CJS; added `"require"` condition to shared exports map
- **Files modified:** tsconfig.json (both packages), package.json (both packages)
- **Verification:** `node dist/index.js` without env exits cleanly; with env starts and awaits stdin
- **Committed in:** a12d074

---

**Total deviations:** 1 auto-fixed (blocking runtime issue)
**Impact on plan:** Essential fix; no scope creep; plugin unaffected.

## Issues Encountered
None beyond the auto-fixed ESM resolution issue above.

## User Setup Required
**Human IDE verification checkpoint (Task 3) is still pending.** See 04-03-PLAN.md for step-by-step instructions to configure the MCP server in Cursor/Trae and verify all three tools work against a Figma file with injected audit data.

## Next Phase Readiness
- MCP server is deployable. To use: set FIGMA_ACCESS_TOKEN + FIGMA_FILE_KEYS, run `node packages/mcp-server/dist/index.js`
- Phase 5 (Distribution) can now package the server for npm publication
- Human verification (Task 3) should be done before Phase 5

---
*Phase: 04-mcp-server*
*Completed: 2026-03-04*
