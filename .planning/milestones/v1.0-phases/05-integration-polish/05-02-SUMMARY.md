---
phase: 05-integration-polish
plan: "02"
subsystem: docs
tags: [readme, mcp-server, cursor, trae, figma, setup-guide]

# Dependency graph
requires:
  - phase: 04-mcp-server
    provides: "MCP server with get_design_tokens, get_component_specs, get_audit_summary tools"
  - phase: 03-data-injection
    provides: "Plugin inject workflow writing pluginData chunks"
provides:
  - "Root README.md — complete end-to-end setup guide for plugin + MCP server"
  - "Cursor .cursor/mcp.json configuration format documented"
  - "Trae mcp.json array-format configuration documented"
  - "All three MCP tools documented with parameters and example prompts"
affects: [05-integration-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "README as primary user-facing document covering complete pipeline from plugin install to IDE tool call"

key-files:
  created:
    - README.md
  modified: []

key-decisions:
  - "README structure: 6 sequential steps mirroring exact user journey (install → token → file key → audit → build → configure IDE)"
  - "Both Cursor and Trae configs shown with explicit format differences called out (object vs array mcpServers, command field shape)"
  - "Rate limit documented with session-cache explanation to prevent user confusion about monthly quota"
  - "Pipeline diagram added to README to show how plugin, REST API, MCP server, and IDE connect"

patterns-established:
  - "Setup guide pattern: prerequisites → sequential numbered steps → tool reference → rate limits → troubleshooting → development"

requirements-completed:
  - MCP-01
  - TOOL-01
  - TOOL-02
  - TOOL-03

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 5 Plan 02: README Setup Guide Summary

**Root README.md written covering the complete plugin-to-IDE pipeline: 6-step setup flow, Cursor + Trae MCP configs with format differences, all three tool descriptions, Figma rate limit guidance, and troubleshooting.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T08:11:12Z
- **Completed:** 2026-03-05T08:19:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- README.md at repo root with 308 lines (minimum was 150)
- All six setup steps documented sequentially: plugin install, Figma personal access token, file key extraction, audit + inject workflow, MCP server build, IDE configuration
- Both Cursor (object-style `mcpServers`) and Trae (array-style `mcpServers` with command-as-array) config formats documented with explicit format difference callout
- All three MCP tools (`get_design_tokens`, `get_component_specs`, `get_audit_summary`) documented with parameters, optional/default values, and example AI prompts
- Rate limit (6 GET requests per month on free plan) and session cache behavior explained
- Troubleshooting section covering 403, out-of-sync, no-data, path errors, and rate limit exhaustion scenarios
- Pipeline flow diagram added to make data flow from Figma through MCP server to IDE clear

## Task Commits

Each task was committed atomically:

1. **Task 1: Write root README.md** - `487e701` (docs)

**Plan metadata:** (pending — final docs commit)

## Files Created/Modified

- `README.md` — Complete setup guide: plugin install, Figma token, file key, audit+inject, MCP server build, Cursor config, Trae config, all three tools, rate limits, troubleshooting, development commands

## Decisions Made

- Included a pipeline flow diagram at the bottom of the README as an ASCII art section — provides a quick mental model of how the components connect without requiring a separate architecture document
- Explicitly called out format differences between Cursor and Trae configs rather than just showing both in parallel — users often copy one then wonder why the other doesn't work
- Used "Step N" heading structure rather than a flat list — mirrors how users actually follow the setup in sequence and allows linking to specific steps

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. The README itself documents what external configuration users need to perform (Figma token, IDE config).

## Next Phase Readiness

- README covers complete setup pipeline — ready for community submission (Plan 05-03)
- All three MCP tools documented for user reference
- Rate limit behavior documented to prevent support questions

---

## Self-Check: PASSED

- `README.md` — FOUND at D:/programacion/proyectos/ai-ready-ds-auditor/README.md
- Commit `487e701` — FOUND in git log

---
*Phase: 05-integration-polish*
*Completed: 2026-03-05*
