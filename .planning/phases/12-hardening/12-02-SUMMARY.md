---
phase: 12-hardening
plan: 02
subsystem: ui, api
tags: [error-handling, naming-consistency, schema-version, mcp-tools]

# Dependency graph
requires:
  - phase: 12-hardening
    provides: UI hardening (banner copy, ConfigView layout, double-press guard)
  - phase: 11-mcp-component-tools
    provides: MCP tools, SVG store, SchemaVersionError, component extraction
provides:
  - Verified actionable error messages in plugin UI (no raw err.message leaks)
  - Verified SchemaVersionError uses canonical user-friendly message
  - Verified naming consistency across all three packages (plugin, shared, mcp-server)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Error message pattern: raw error to console.error, actionable string to UI"
    - "Shared constants pattern: both writer (plugin) and reader (MCP) import from @shared/constants"

key-files:
  created: []
  modified: []

key-decisions:
  - "VERIFY-01: All error messages already actionable from prior plan execution -- no code changes needed"
  - "VERIFY-02: SchemaVersionError already uses canonical message 'Saved data is outdated' from Phase 11"
  - "VERIFY-03: Naming fully consistent across all 5 dimensions -- plugin data keys, shared types, MCP parameters, schema version, message types"

patterns-established:
  - "Naming audit pattern: 5-dimension verification (data keys, types, tool params, schema version, message types)"

requirements-completed: [FIX-03, FIX-04, FIX-05]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 12 Plan 02: Error Messages & Naming Consistency Summary

**Verified actionable error messages in plugin UI, canonical SchemaVersionError message, and full naming consistency across plugin/shared/MCP packages -- all already correct from prior phases**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T09:25:17Z
- **Completed:** 2026-03-19T09:27:17Z
- **Tasks:** 2
- **Files modified:** 0

## Accomplishments

- Verified plugin SCAN_ERROR/INJECT_ERROR use actionable fallback strings with raw errors routed to console.error only
- Verified SchemaVersionError in chunk-reader.ts uses canonical message: 'Saved data is outdated -- Run Audit & Inject to update.'
- Completed 5-dimension naming consistency audit: plugin data keys, shared types, MCP tool parameters, schema version, and message types -- all consistent

## Task Commits

No code changes were needed -- all acceptance criteria were already satisfied by prior plan executions (Phase 11 and Phase 12 Plan 01).

**Plan metadata:** (pending) (docs: complete error-messages and naming-consistency plan)

## Files Created/Modified

No files were modified. All code was already in the correct state.

## Naming Consistency Audit Results

### 1. Plugin Data Key Names (Writer vs Reader)
- **Report chunks:** Plugin `inject.ts` and MCP `chunk-reader.ts` both use `CHUNK_KEY_PREFIX` ('ai_data_') and `META_KEY` ('ai_data_meta') from `@shared/constants` -- CONSISTENT
- **SVG chunks:** Plugin `inject-svgs.ts` and MCP `svg-chunk-reader.ts` both use `SVG_CHUNK_KEY_PREFIX` ('ai_svg_') and `SVG_META_KEY` ('ai_svg_meta') from `@shared/constants` -- CONSISTENT

### 2. Shared Type Names
- `AuditReport` -- shared/types.ts, plugin code.ts, MCP tools -- CONSISTENT
- `ComponentSpec` -- shared/types.ts, MCP tools via report.components -- CONSISTENT
- `SvgRecord` -- shared/types.ts, inject-svgs.ts, svg-chunk-reader.ts -- CONSISTENT
- `DesignToken` -- shared/types.ts, get-design-tokens.ts -- CONSISTENT
- `AuditIssue` -- shared/types.ts, get-audit-summary.ts -- CONSISTENT

### 3. MCP Tool Parameter Names
- All 4 tools use `fileKey` (camelCase, not snake_case) -- CONSISTENT
- `get-component-specs.ts` and `get-component-svg.ts` both use `componentName` and `componentId` -- CONSISTENT
- `get-audit-summary.ts` uses `category` -- CONSISTENT
- `get-design-tokens.ts` uses `framework` -- CONSISTENT

### 4. Schema Version
- `shared/index.ts`: `schemaVersion = '2.0.0'`
- `chunk-reader.ts`: imports `schemaVersion as currentSchemaVersion` from shared -- CONSISTENT
- `serialize.ts`: passes through report.schemaVersion (set by assembleReport) -- CONSISTENT

### 5. Message Type Names
- SandboxMessage discriminants (messages.ts) map to AppAction types (state.ts) via useAppMessages hook
- Intentional mapping differences: `CONTEXT_STATUS_CHECK` -> `SET_CONTEXT_STATUS`, `FILE_KEY` -> `SET_FILE_KEY` (sandbox event names vs reducer action names) -- CONSISTENT

## Decisions Made

- VERIFY-01: All error messages were already actionable from prior plan execution -- no code changes required for FIX-04
- VERIFY-02: SchemaVersionError already contained canonical message from Phase 11 SCHEMA-01 decision -- no changes for FIX-04
- VERIFY-03: Full naming consistency confirmed across all three packages -- no divergence found for FIX-05

## Deviations from Plan

None -- plan executed exactly as written. The verification pass confirmed all code was already correct.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12 Hardening is now complete (Plan 01 + Plan 02)
- All FIX requirements verified: FIX-01 through FIX-05
- Ready for final release preparation or merge to master

---
*Phase: 12-hardening*
*Completed: 2026-03-19*
