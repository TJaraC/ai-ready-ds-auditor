# Roadmap: AI-Ready Design System Auditor

## Overview

This roadmap delivers a production-grade Figma plugin and local MCP server that bridge Design Systems to AI-powered IDEs for Non-Enterprise Figma users. The build flows from shared foundations through the plugin's audit engine, injection pipeline, and UI, then to the MCP server that consumes the injected data, finishing with end-to-end integration and polish. Each phase produces working software that can be independently verified.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffold, shared types with schemaVersion, dual-build Vite plugin, sandbox/UI message protocol (completed 2026-03-03)
- [ ] **Phase 2: Audit Engine** - Four auditors (color, typography, spacing, components) with scene graph traversal and progress reporting
- [ ] **Phase 3: Data Injection & Plugin UI** - Chunked setPluginData injection, change detection, two-tab React UI with health dashboard
- [ ] **Phase 4: MCP Server** - Figma REST API client, chunk reconstruction, three tool handlers, four CSS framework formatters, error handling
- [ ] **Phase 5: Integration & Polish** - End-to-end pipeline validation, error boundaries, bundle size verification, Figma Community readiness

## Phase Details

### Phase 1: Foundation
**Goal**: Developer can build all three packages from a single monorepo with strict TypeScript, shared types define the data contract between plugin and server, and the Figma plugin scaffold proves sandbox/UI communication works
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06
**Success Criteria** (what must be TRUE):
  1. Running `npm run build` from the repo root successfully compiles all three packages with zero TypeScript errors under strict mode
  2. The shared types package exports `AuditReport`, `AuditMeta`, `DesignToken`, `ComponentSpec`, chunking constants, and `schemaVersion` -- and both plugin and mcp-server packages can import them
  3. Running `npm run dev` in the plugin package produces a `code.js` and a single-file `ui.html` that Figma can load
  4. A round-trip message (sandbox sends typed message to UI, UI echoes back) completes successfully in the loaded plugin, proving the typed message protocol works
  5. ESLint and Prettier pass across all packages with `npm run lint`, including the `console.log` ban in mcp-server
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Monorepo root scaffold, tooling installation, packages/shared types (schemaVersion, AuditReport, AuditIssue, DesignToken, ComponentSpec, AuditMeta, SandboxMessage, UIMessage, chunking constants)
- [ ] 01-02-PLAN.md -- Plugin package: dual Vite configs (sandbox IIFE + single-file UI), Figma manifest, sandbox/UI tsconfigs, React stub, dev watch mode
- [ ] 01-03-PLAN.md -- Round-trip message proof: ping button in UI, production build, human Figma verification checkpoint

### Phase 2: Audit Engine
**Goal**: The plugin can scan any Figma document and produce a complete, typed AuditReport identifying hardcoded colors, typography, spacing, and disconnected components
**Depends on**: Phase 1
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-07, AUDIT-08, AUDIT-09
**Success Criteria** (what must be TRUE):
  1. Plugin traverses the full scene graph and detects fills/strokes using raw hex/rgb values instead of bound variables or color styles
  2. Plugin detects text nodes with hardcoded fontSize/fontWeight not bound to text styles or variables
  3. Plugin detects auto-layout nodes with hardcoded padding/itemSpacing not using spacing variables
  4. Plugin detects frame/group layers that match existing components but are not instances
  5. Each audit issue includes node ID, node name, page name, issue type, offending value, and suggested fix -- assembled into a typed AuditReport with schemaVersion
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Data Injection & Plugin UI
**Goal**: Plugin injects audit data into the Figma file with chunking, detects when data goes stale, and presents a production-quality two-tab UI with health dashboard and AI context controls
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10
**Success Criteria** (what must be TRUE):
  1. Clicking "Inject / Update" runs a full audit and writes the results to the Figma file via setPluginData, with automatic chunking when data exceeds 90kB (verified with TextEncoder byte counting)
  2. After injection, modifying a component/style/variable in Figma triggers a red "Out of Sync" indicator in the plugin UI within a few seconds
  3. The "Audit & Inject" tab displays a health dashboard showing total components, tokens, issue counts by category, and an overall health score -- each issue is clickable and navigates the canvas to the offending node
  4. The "AI Context" tab allows selecting a CSS framework, exporting the injected JSON, and displays the File ID and metadata needed for MCP server configuration
  5. All async operations show loading states and all errors display clear, actionable messages (not raw error objects)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: MCP Server
**Goal**: A local MCP server connects to Figma files via the REST API, reconstructs the injected audit data, and exposes it as three tools consumable by Cursor, Trae, and other MCP-compatible IDEs
**Depends on**: Phase 3
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, ERR-01, ERR-02, ERR-03, ERR-04, TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05, FMT-01, FMT-02, FMT-03, FMT-04
**Success Criteria** (what must be TRUE):
  1. MCP server starts via stdio transport and loads one or more Figma files with a single API call each, reconstructing chunked data and caching it in memory
  2. `get_design_tokens` tool returns color, typography, and spacing tokens formatted correctly for each of the four CSS frameworks (Tailwind config object, CSS Variables declarations, CSS Modules exports, styled-components theme object)
  3. `get_component_specs` tool returns full component specification by name or ID, including props, variants, and usage notes
  4. `get_audit_summary` tool returns structured audit issues with node IDs, issue types, and suggested fixes, filterable by file and category
  5. Server returns structured, actionable errors for 403 (permission instructions), 429 (retries with backoff), corrupted chunks (re-injection instructions), and schema version mismatches
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Integration & Polish
**Goal**: The full pipeline works end-to-end (plugin audit, inject, REST API read, MCP tool response) with production quality suitable for Figma Community publication and daily designer use
**Depends on**: Phase 4
**Requirements**: (Cross-cutting validation of all requirements -- no new requirements introduced)
**Success Criteria** (what must be TRUE):
  1. A designer can install the plugin, audit a real Figma file, inject the data, then configure an MCP server in Cursor or Trae that successfully returns design tokens, component specs, and audit summaries from that file
  2. Plugin UI bundle size is under 200kB gzipped
  3. Plugin manifest and UI meet Figma Community submission criteria
  4. No `any` types exist in the codebase; `npm run type-check` passes with zero errors across all packages
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 --> 2 --> 3 --> 4 --> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-03 |
| 2. Audit Engine | 0/? | Not started | - |
| 3. Data Injection & Plugin UI | 0/? | Not started | - |
| 4. MCP Server | 0/? | Not started | - |
| 5. Integration & Polish | 0/? | Not started | - |
