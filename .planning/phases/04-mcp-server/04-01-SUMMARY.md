---
phase: 04-mcp-server
plan: "01"
subsystem: api
tags: [mcp, figma-rest-api, typescript, zod, modelcontextprotocol, cache, chunk-reconstruction]

# Dependency graph
requires:
  - phase: 03-data-injection
    provides: "Chunked setPluginData injection (ai_data_meta + ai_data_1..N) written to Figma file"
  - phase: 01-foundation
    provides: "packages/shared with AuditReport, AuditMeta, META_KEY, CHUNK_KEY_PREFIX, schemaVersion exports"
provides:
  - "Typed Figma REST API response interfaces (FigmaNode, GetFileResponse)"
  - "Structured error classes with actionable messages (FigmaPermissionError, FigmaRateLimitError, FigmaMonthlyLimitError, FigmaApiError)"
  - "fetchFigmaFile() — authenticated Figma REST client with 429 retry and monthly-limit detection"
  - "reconstructReport() — pure function that reads META_KEY, concatenates ai_data_1..N chunks, validates schema version"
  - "DesignSystemCache — session-scoped in-memory Map with ensureLoaded() lazy-fetch orchestration"
affects:
  - 04-02-PLAN.md (CSS formatters and get_design_tokens / get_component_specs tools)
  - 04-03-PLAN.md (get_audit_summary tool, server.ts wiring, index.ts entry point)

# Tech tracking
tech-stack:
  added:
    - "@modelcontextprotocol/sdk ^1.27.1"
    - "zod ^4.3.6"
  patterns:
    - "Structured error classes: errors carry fileKey + actionable multi-line messages for tool responses"
    - "fetchWithRetry: loop approach (not recursive) with Retry-After > 3600s = monthly limit guard"
    - "Cache-first lazy loading: ensureLoaded() checks Map before any API call (MCP-06, MCP-02)"
    - "process.stderr.write for all logging (ESLint bans console.* in mcp-server)"

key-files:
  created:
    - "packages/mcp-server/src/figma/types.ts"
    - "packages/mcp-server/src/figma/client.ts"
    - "packages/mcp-server/src/figma/chunk-reader.ts"
    - "packages/mcp-server/src/cache/store.ts"
  modified:
    - "packages/mcp-server/package.json"
    - "package-lock.json"

key-decisions:
  - "PLUGIN_ID '1610802699324330019' hardcoded in client.ts — matches packages/plugin/manifest.json id field"
  - "Retry-After > 3600s throws FigmaMonthlyLimitError immediately (no retry loop for monthly exhaustion)"
  - "checksum skip: meta.checksum === '' skips validation — plugin currently writes empty checksum"
  - "pluginData accessed via fileResponse.document.pluginData with ?? {} fallback for missing data"
  - "moduleResolution: bundler — .js extensions used in all relative imports for ESM Node.js compatibility"

patterns-established:
  - "Error-as-content pattern: error classes throw with step-by-step instructions for tool handlers to surface to LLM"
  - "Session cache invariant: one Figma API call per fileKey per process lifetime"

requirements-completed:
  - MCP-01
  - MCP-02
  - MCP-03
  - MCP-04
  - MCP-05
  - MCP-06
  - MCP-07
  - MCP-08
  - MCP-09
  - ERR-01
  - ERR-02
  - ERR-03
  - ERR-04

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 4 Plan 01: MCP Server Infrastructure Summary

**Figma REST API client with 429 retry + monthly-limit detection, chunk reconstruction from ai_data_meta/ai_data_1..N, and session-scoped DesignSystemCache using @modelcontextprotocol/sdk + zod**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T09:35:49Z
- **Completed:** 2026-03-04T09:38:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed @modelcontextprotocol/sdk ^1.27.1 and zod ^4.3.6 into packages/mcp-server workspace
- Built fully-typed Figma REST API layer: FigmaNode/GetFileResponse interfaces + 4 structured error classes with actionable step-by-step messages
- Created fetchFigmaFile() with fetchWithRetry() that distinguishes monthly quota exhaustion (Retry-After > 3600s) from per-minute rate limiting
- Created reconstructReport() pure function that reads META_KEY metadata, concatenates ai_data_1..N chunks, validates schema version, and skips empty checksum (matches plugin's current implementation)
- Created DesignSystemCache with ensureLoaded() ensuring exactly one Figma API call per file per session

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Figma API types** - `3c82a64` (feat)
2. **Task 2: Figma API client with retry and chunk reconstruction** - `82ed377` (feat)
3. **Task 3: In-memory cache with lazy-load orchestration** - `9885c8a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `packages/mcp-server/package.json` — Added @modelcontextprotocol/sdk and zod dependencies
- `packages/mcp-server/src/figma/types.ts` — FigmaNode, GetFileResponse interfaces; FigmaPermissionError, FigmaRateLimitError, FigmaMonthlyLimitError, FigmaApiError classes
- `packages/mcp-server/src/figma/client.ts` — fetchFigmaFile() with fetchWithRetry() retry loop and monthly-limit guard
- `packages/mcp-server/src/figma/chunk-reader.ts` — reconstructReport() pure function; ChunkReconstructionError and SchemaVersionError classes
- `packages/mcp-server/src/cache/store.ts` — DesignSystemCache class with has/get/ensureLoaded/defaultFileKey
- `package-lock.json` — Updated with new dependencies

## Decisions Made

- PLUGIN_ID `1610802699324330019` hardcoded in client.ts — must match packages/plugin/manifest.json id field (confirmed match)
- Retry-After > 3600s throws FigmaMonthlyLimitError immediately without retry (monthly quota cannot be recovered via backoff)
- checksum === '' skips validation — plugin currently writes empty string checksum; non-empty checksums log a warning but are not validated (future enhancement)
- fileResponse.document.pluginData accessed with `?? {}` fallback — prevents crash when pluginData is absent; reconstructReport handles empty object by throwing ChunkReconstructionError with instructions
- .js extensions used in all relative imports within mcp-server (moduleResolution: bundler, compiles to ESM output)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required at this stage. Environment variables (FIGMA_ACCESS_TOKEN, FIGMA_FILE_KEYS) are wired in Plan 04-03.

## Next Phase Readiness

- Infrastructure layer complete: types, client, chunk-reader, and cache all export stable contracts
- Plan 04-02 can import fetchFigmaFile from '../figma/client.js', reconstructReport from '../figma/chunk-reader.js', DesignSystemCache from '../cache/store.js'
- Plan 04-03 wires index.ts entry point with env validation and StdioServerTransport
- No blockers.

---
*Phase: 04-mcp-server*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: packages/mcp-server/src/figma/types.ts
- FOUND: packages/mcp-server/src/figma/client.ts
- FOUND: packages/mcp-server/src/figma/chunk-reader.ts
- FOUND: packages/mcp-server/src/cache/store.ts
- FOUND: .planning/phases/04-mcp-server/04-01-SUMMARY.md
- FOUND commit: 3c82a64 (Task 1)
- FOUND commit: 82ed377 (Task 2)
- FOUND commit: 9885c8a (Task 3)
