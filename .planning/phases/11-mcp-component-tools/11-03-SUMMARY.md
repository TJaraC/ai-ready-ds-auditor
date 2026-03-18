---
phase: 11-mcp-component-tools
plan: 03
subsystem: api
tags: [mcp, svg, cache, vitest, tdd, chunk-reader]

# Dependency graph
requires:
  - phase: 11-01
    provides: SvgRecord type in shared/types.ts and SVG_CHUNK_KEY_PREFIX/SVG_META_KEY constants
  - phase: 11-02
    provides: plugin-side SVG injection writing ai_svg_1/2/... + ai_svg_meta plugin data
provides:
  - assembleSvgChunks() reads SVG chunk store from pluginData (parallel to assembleChunks)
  - CacheEntry.svgs: SvgRecord[] populated on every ensureLoaded call
  - get_component_svg MCP tool — lookup by name or ID, returns SVG markup with metadata
affects:
  - 11-04 (server.ts registers get_component_svg via registerGetComponentSvg)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SvgChunkError parallel to ChunkReconstructionError — named error with fileKey property
    - Optional store pattern: missing meta key returns [] instead of throwing (SVG store is optional, report store is required)
    - _registeredTools plain object access pattern for McpServer tool capture in tests

key-files:
  created:
    - packages/mcp-server/src/figma/svg-chunk-reader.ts
    - packages/mcp-server/src/figma/svg-chunk-reader.test.ts
    - packages/mcp-server/src/tools/get-component-svg.ts
    - packages/mcp-server/src/tools/get-component-svg.test.ts
  modified:
    - packages/mcp-server/src/cache/store.ts

key-decisions:
  - "SVG-READER-01: assembleSvgChunks returns [] when ai_svg_meta missing — SVG store is optional, unlike report store which throws"
  - "SVG-READER-02: _registeredTools is a plain object on McpServer (not a Map) — access via bracket notation in tests"
  - "SVG-CACHE-01: svgs field added to CacheEntry as SvgRecord[] — empty array when no SVG store injected"

patterns-established:
  - "Optional chunk store pattern: return [] on missing meta instead of throw (for non-required stores)"
  - "MCP tool test pattern: capture handler via (server as any)._registeredTools['tool_name'].handler"

requirements-completed: [SVG-01, SVG-02, SVG-03]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 11 Plan 03: MCP SVG Reader, Cache Extension, get_component_svg Tool Summary

**assembleSvgChunks() reads ai_svg_* plugin data chunks into SvgRecord[], CacheEntry gains svgs field, get_component_svg MCP tool returns SVG markup or descriptive errors for all three SVG requirements (SVG-01/02/03)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T08:24:05Z
- **Completed:** 2026-03-18T08:32:00Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 5

## Accomplishments
- `assembleSvgChunks()` implemented as symmetric counterpart to `assembleChunks()` — reads optional SVG store from plugin data, returns empty array when not present
- `CacheEntry` extended with `svgs: SvgRecord[]` field; `ensureLoaded()` now populates it via `assembleSvgChunks` on every cache miss
- `registerGetComponentSvg()` MCP tool handles all three SVG requirement cases: success (SVG-02), error field (SVG-03), not found with available list
- All 34 mcp-server tests pass (8 svg-chunk-reader + 7 get-component-svg + 12 chunk-reader + 7 adapter)

## Task Commits

Each task was committed atomically:

1. **RED phase: failing tests** - `8e09ec8` (test)
2. **GREEN phase: implementations** - `3cfedd3` (feat)

_Note: TDD plan — two commits per the RED/GREEN pattern_

## Files Created/Modified
- `packages/mcp-server/src/figma/svg-chunk-reader.ts` — `assembleSvgChunks()` + `SvgChunkError`; reads ai_svg_meta + ai_svg_N chunks
- `packages/mcp-server/src/figma/svg-chunk-reader.test.ts` — 8 tests: success, empty store, multi-chunk, viewBox, error field, missing chunk, fileKey on error
- `packages/mcp-server/src/cache/store.ts` — imports `SvgRecord`, `assembleSvgChunks`; adds `svgs: SvgRecord[]` to `CacheEntry`; calls `assembleSvgChunks` in `ensureLoaded`
- `packages/mcp-server/src/tools/get-component-svg.ts` — `registerGetComponentSvg()` MCP tool with name/ID lookup and full error/success pattern
- `packages/mcp-server/src/tools/get-component-svg.test.ts` — 7 tests: no args, empty store, name lookup, ID precedence, no viewBox, error field, not found list

## Decisions Made
- `assembleSvgChunks` returns `[]` when `ai_svg_meta` is missing: SVG store is optional (not all files have SVGs injected), unlike the report store which always throws when missing
- `SvgChunkError` mirrors `ChunkReconstructionError` with a `fileKey` property for consistent error identification
- `_registeredTools` on `McpServer` is a plain object (not a `Map`) — test helper uses bracket notation `tools['get_component_svg']` not `.get()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed McpServer._registeredTools access in test helper**
- **Found during:** GREEN phase (get-component-svg.test.ts)
- **Issue:** Test helper used `.get()` (Map API) but `_registeredTools` is a plain object
- **Fix:** Changed `tools.get('get_component_svg')` to `tools['get_component_svg']` in `captureToolHandler`
- **Files modified:** packages/mcp-server/src/tools/get-component-svg.test.ts
- **Verification:** All 7 get-component-svg tests pass after fix
- **Committed in:** 3cfedd3 (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test infrastructure)
**Impact on plan:** Auto-fix essential for tests to run. Implementation files required zero deviation.

## Issues Encountered
- `_registeredTools` on `McpServer` is a plain object, not a `Map` — test infrastructure assumed Map API. Fixed inline during GREEN phase execution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `registerGetComponentSvg` is ready to be imported and called in `server.ts` (Plan 04)
- All three SVG requirements (SVG-01, SVG-02, SVG-03) covered by tests and implementation
- No blockers

---
*Phase: 11-mcp-component-tools*
*Completed: 2026-03-18*
