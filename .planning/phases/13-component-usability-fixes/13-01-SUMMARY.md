---
phase: 13-component-usability-fixes
plan: 01
subsystem: audit
tags: [figma, components, publish-status, deduplication]

# Dependency graph
requires:
  - phase: 09-audit-flow-v2
    provides: classifyPublishStatus function and ComponentSpec collection in index.ts
  - phase: 11-mcp-component-tools
    provides: ComponentSpec v2 fields (layers, variants, states) and get_component_specs tool
provides:
  - "2-state classifyPublishStatus (published | private) — no dead 'local' branch"
  - "COMPONENT_SET name deduplication for ComponentSpec collection"
  - "Clean unpublishedCount filter (private only)"
affects: [mcp-server, get_component_specs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "seenComponentSets Map for per-page COMPONENT_SET deduplication"
    - "parentSet.name resolution for human-readable component names"

key-files:
  created: []
  modified:
    - packages/plugin/src/sandbox/audit/components.ts
    - packages/plugin/src/sandbox/audit/components.test.ts
    - packages/plugin/src/sandbox/audit/index.ts

key-decisions:
  - "BUG-01: Removed master param — Figma Plugin API does not expose master on COMPONENT nodes; 2-state return (published|private)"
  - "BUG-02: Component names use COMPONENT_SET parent name, not variant property strings; deduplication via Map per page"
  - "Dead code: removed 'local' branch from unpublishedCount filter since classifyPublishStatus can never return 'local'"

patterns-established:
  - "COMPONENT_SET name resolution: parentSet ? parentSet.name : comp.name"
  - "Per-page deduplication: seenComponentSets Map scoped inside page loop"

requirements-completed: [BUG-01, BUG-02]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 13 Plan 01: Component Usability Fixes Summary

**Fixed classifyPublishStatus to 2-state (published|private) and deduplicated components by COMPONENT_SET name for correct get_component_specs lookups**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T19:33:58Z
- **Completed:** 2026-03-19T19:36:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- classifyPublishStatus reduced to 1-arg function returning 'published' | 'private' -- eliminates false 'local' status from non-existent Figma master property
- Component names now use COMPONENT_SET parent name instead of variant property strings -- get_component_specs("Button") now finds the correct spec
- Per-page deduplication via seenComponentSets Map prevents duplicate ComponentSpecs for multi-variant component sets
- Cleaned unpublishedCount filter to only check 'private' (removed dead 'local' branch)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix classifyPublishStatus -- remove master param, update tests** - `dcd4edc` (fix) [TDD: red/green]
2. **Task 2: Deduplicate components by COMPONENT_SET name + clean unpublishedCount filter** - `d7b9711` (fix)

## Files Created/Modified
- `packages/plugin/src/sandbox/audit/components.ts` - classifyPublishStatus now 1-arg, returns 'published' | 'private'
- `packages/plugin/src/sandbox/audit/components.test.ts` - Updated tests for 2-state function, removed 'local' test cases
- `packages/plugin/src/sandbox/audit/index.ts` - COMPONENT_SET name resolution, deduplication Map, 1-arg classifyPublishStatus call, clean unpublishedCount filter

## Decisions Made
- BUG-01: Figma Plugin API does not expose `master` on COMPONENT nodes -- removed the parameter entirely rather than defaulting it
- BUG-02: First variant per COMPONENT_SET wins deduplication -- all variants still exported as individual SVGs
- Kept `'local'` in the shared `publishStatus` union type (harmless wider type) but removed all runtime paths that produce it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both component usability bugs fixed
- 178/178 tests green, TypeScript compiles cleanly
- get_component_specs tool will now return correct component names and publish statuses

---
*Phase: 13-component-usability-fixes*
*Completed: 2026-03-19*
