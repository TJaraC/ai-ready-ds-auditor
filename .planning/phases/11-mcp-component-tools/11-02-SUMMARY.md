---
phase: 11-mcp-component-tools
plan: 02
subsystem: plugin-sandbox
tags: [typescript, layer-extraction, svg-export, component-spec, tdd, figma-plugin]

# Dependency graph
requires:
  - phase: 11-mcp-component-tools
    plan: 01
    provides: "AuditNodeComponent interface in inputs.ts; ComponentLayer, LayerFill, LayerStroke, SvgRecord, LayerStateEntry types in shared/types.ts; SVG chunk key constants"
provides:
  - "extract-layers.ts: extractLayerTree, getVariantMap, buildStatesMap, resolveFillSourceSync, findStatePropertyName, extractViewBox — pure, testable, zero Figma globals"
  - "serialize-svgs.ts: serializeSvgStore() — same 81k-char chunking algorithm as serializeReport()"
  - "inject-svgs.ts: injectSvgs() — clears ai_svg_* keys, writes chunks, writes ai_svg_meta last"
  - "audit/index.ts Pass 2: populates ComponentSpec.layers, .variants, .states; collects SvgRecord[]"
  - "runAudit() return type: { report: AuditReport; svgRecords: SvgRecord[] }"
affects:
  - 11-03 (svg-chunk-reader.ts reads ai_svg_* keys written by injectSvgs)
  - 11-04 (get-component-specs.ts receives ComponentSpec with full layers/variants/states from MCP store)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD red-green: failing test commit (module-not-found) → implementation commit (all green)"
    - "Pure extraction layer: extract-layers.ts has zero Figma globals; figma.mixed accessed via (globalThis as ...).figma?.mixed for test compatibility"
    - "resolvedVariables Map pattern: sync fill resolution takes pre-built Map<id, {name,hex}> — async variable lookup deferred to future enhancement"
    - "SVG store parallel to report store: separate key prefix (ai_svg_*) + separate meta key (ai_svg_meta) — no interference with ai_data_* report keys"

key-files:
  created:
    - packages/plugin/src/sandbox/audit/extract-layers.ts
    - packages/plugin/src/sandbox/audit/extract-layers.test.ts
    - packages/plugin/src/sandbox/serialize-svgs.ts
    - packages/plugin/src/sandbox/inject-svgs.ts
  modified:
    - packages/plugin/src/sandbox/audit/index.ts
    - packages/plugin/src/sandbox/code.ts

key-decisions:
  - "EXTRACT-01: extractLayerTree is synchronous with an optional resolvedVariables Map parameter — async variable lookup (getVariableByIdAsync) deferred; resolvedVariables defaults to empty Map so existing callers work without change"
  - "EXTRACT-02: VECTOR nodes get no children field — no path geometry in layer tree; SVG tool handles full vector content"
  - "EXTRACT-03: cornerRadius symbol → 'mixed' string using typeof guard + optional mixedSymbol comparison — consistent with existing AuditNodeBorder pattern"
  - "SVG-INJECT-01: injectSvgs called unconditionally on INJECT_DATA (alongside injectReport) — both stores always written together on every injection"

patterns-established:
  - "Pattern: figma.mixed in pure functions — access via (globalThis as unknown as { figma?: { mixed: symbol } }).figma?.mixed; allows both real Figma runtime (global exists) and Node/Vitest test (mock set on globalThis)"
  - "Pattern: SVG export error handling — catch block pushes SvgRecord with error field and descriptive message; never throws; callers always get a record per component"
  - "Pattern: Pass 2 layer extraction flow — variants from parent COMPONENT_SET → layers from extractLayerTree → states from buildStatesMap if State/Interaction property found"

requirements-completed: [SPEC-01, SPEC-02, SPEC-03, SVG-01]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 11 Plan 02: Layer Extraction and SVG Export Summary

**Pure TDD-tested layer extraction (extractLayerTree/getVariantMap/buildStatesMap) + SVG store serialization/injection — Pass 2 of runAudit() now populates ComponentSpec v2 fields and collects SvgRecord[] for injection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T08:16:48Z
- **Completed:** 2026-03-18T08:20:52Z
- **Tasks:** 2 (RED + GREEN phases)
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- Created `extract-layers.ts` with pure extraction functions: extractLayerTree (recursive layer tree), getVariantMap (VARIANT property filter), buildStatesMap (state/interaction variant detection), resolveFillSourceSync (fill source resolution), findStatePropertyName, extractViewBox
- Created `serialize-svgs.ts` as exact parallel to `serialize.ts` — same 81k-char chunking algorithm applied to SvgRecord[] arrays
- Created `inject-svgs.ts` as exact parallel to `inject.ts` — clears ai_svg_* keys before writing new chunks + meta
- Updated `audit/index.ts` Pass 2: ComponentSpec.layers/variants/states now populated with real extracted data; SVG exportAsync called per component; runAudit() returns `{ report, svgRecords }`
- Updated `code.ts`: START_SCAN/INJECT_DATA destructure `{ report, svgRecords }` from runAudit(); injectSvgs(svgRecords) called on INJECT_DATA
- 21 new tests in extract-layers.test.ts; all 144 plugin tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: RED phase — failing tests for extract-layers and serialize-svgs** - `84fe21a` (test)
2. **Task 2: GREEN phase — implement extract-layers.ts, serialize-svgs.ts, inject-svgs.ts, wire index.ts** - `781da25` (feat)

**Plan metadata:** (docs commit — added after state updates)

_TDD plan: RED commit first (module-not-found failures confirmed), then GREEN commit (all 144 tests pass)_

## Files Created/Modified

- `packages/plugin/src/sandbox/audit/extract-layers.ts` - Pure extraction functions: extractLayerTree (recursive ComponentLayer), getVariantMap, buildStatesMap, resolveFillSourceSync, findStatePropertyName, extractViewBox
- `packages/plugin/src/sandbox/audit/extract-layers.test.ts` - 21 tests covering SPEC-01/02/03 and SVG-01 (written in RED phase, all pass in GREEN phase)
- `packages/plugin/src/sandbox/serialize-svgs.ts` - serializeSvgStore() — identical chunking algorithm to serializeReport(), SvgRecord[] input
- `packages/plugin/src/sandbox/inject-svgs.ts` - injectSvgs() — clears ai_svg_* keys, writes chunks with 1-based keys, writes ai_svg_meta last
- `packages/plugin/src/sandbox/audit/index.ts` - Pass 2 updated to extract layers/variants/states; SVG export loop added; runAudit() return type changed
- `packages/plugin/src/sandbox/code.ts` - Destructures { report, svgRecords } from runAudit(); calls injectSvgs(svgRecords) on INJECT_DATA

## Decisions Made

- EXTRACT-01: extractLayerTree is synchronous with optional resolvedVariables Map; async variable lookup deferred — empty map default means fill sources will be 'hardcoded' until a future pass pre-resolves variable IDs
- EXTRACT-02: VECTOR nodes have no children in layer tree — SVG tool handles full vector content; structural decomposition stops at VECTOR boundary
- EXTRACT-03: cornerRadius symbol check uses `typeof ... === 'symbol'` first, then optional mixedSymbol comparison — handles both real Figma runtime and Node test environment
- SVG-INJECT-01: injectSvgs always called alongside injectReport on INJECT_DATA — both stores stay in sync with every injection

## Deviations from Plan

None — plan executed exactly as written. TDD cycle: RED tests committed with module-not-found failures → implementation → GREEN with all 144 tests passing.

## Issues Encountered

None — implementation matched plan specification exactly. The sync/async variable resolution trade-off was documented in the plan (deferred to future enhancement) and implemented as specified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 complete: extract-layers.ts exports are ready for Plan 04 (get-component-specs.ts wiring)
- Plan 03 (svg-chunk-reader.ts, store.ts) can now proceed: injectSvgs writes ai_svg_1/ai_svg_2.../ai_svg_meta keys ready for MCP-side reading
- All 144 plugin tests pass; no type errors introduced
- runAudit() return shape change is contained: only code.ts consumes it; utils.test.ts tests assembleReport directly (not runAudit)

---
*Phase: 11-mcp-component-tools*
*Completed: 2026-03-18*

## Self-Check: PASSED

- FOUND: packages/plugin/src/sandbox/audit/extract-layers.ts
- FOUND: packages/plugin/src/sandbox/audit/extract-layers.test.ts
- FOUND: packages/plugin/src/sandbox/serialize-svgs.ts
- FOUND: packages/plugin/src/sandbox/inject-svgs.ts
- FOUND: .planning/phases/11-mcp-component-tools/11-02-SUMMARY.md
- FOUND commit 84fe21a (test RED phase)
- FOUND commit 781da25 (feat GREEN phase)
