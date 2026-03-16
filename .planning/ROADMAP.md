# Roadmap: AI-Ready Design System Auditor

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-05)
- 🚧 **v2.0 Figma-Faithful UI + Enhanced MCP** — Phases 6-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-05</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-03
- [x] Phase 2: Audit Engine (3/3 plans) — completed 2026-03-03
- [x] Phase 3: Data Injection & Plugin UI (3/3 plans) — completed 2026-03-03
- [x] Phase 4: MCP Server (3/3 plans) — completed 2026-03-04
- [x] Phase 5: Integration & Polish (3/3 plans) — completed 2026-03-05

Full phase details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

---

### 🚧 v2.0 Figma-Faithful UI + Enhanced MCP (In Progress)

**Milestone Goal:** Rebuild the plugin UI to match the Figma design exactly, add streaming MCP, enhanced component specs with states, SVG extraction, unpublished component detection, and refactor the codebase for long-term maintainability.

#### Phases

- [x] **Phase 6: Discovery & Architecture Decisions** - Audit the v1.0 codebase, access Figma source frames, and produce concrete decisions for all v2.0 work — completed 2026-03-09
- [x] **Phase 7: Architecture Refactor** - Separate audit, inject, MCP, parsing, and UI state into discrete, testable modules with stable contracts (completed 2026-03-10)
- [x] **Phase 8: UI v2 Base** - Implement the three Figma-faithful core screens (Audit-1, Audit-2, Config-1) with shared state management and all global UI states (completed 2026-03-12)
- [x] **Phase 9: Audit Flow v2** - Add streaming active state, unpublished detection, AI Context status, and wire streaming events through MCP and UI (completed 2026-03-14)
- [ ] **Phase 10: Configuration Flow v2** - Add CSS framework selection, connection status, export status, re-injection guidance, and MCP capability summary to Configuration tab
- [ ] **Phase 11: MCP Component Tools** - Implement `get_component_specs` v2 with computed properties and states, and `get_component_svg` with metadata and error handling
- [ ] **Phase 12: Hardening** - Correct all copy, button states, sync errors, error messages, naming, and loading/error states across the entire product

## Phase Details

### Phase 6: Discovery & Architecture Decisions
**Goal**: The team has full visibility into the v1.0 codebase structure, the Figma source frames are accessible, and every technical decision needed for Phases 7-12 is documented and resolved
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: None (produces decisions, not deliverables)
**Success Criteria** (what must be TRUE):
  1. v1.0 codebase is mapped — every module, its responsibilities, and its coupling points are documented
  2. Figma source frames (Audit-1, Audit-2, Config-1) are accessible and all UI components, tokens, and states are catalogued
  3. MCP SDK streaming API is researched and the implementation approach is decided
  4. All architectural split points from ARCH-01 through ARCH-05 have concrete decisions (which files, which interfaces, which contracts)
  5. A written discovery output exists that Phase 7 can execute against without ambiguity
**Plans**: TBD

### Phase 7: Architecture Refactor
**Goal**: The v1.0 monolithic code is replaced by separated, independently testable modules with stable typed contracts between them — no user-facing behavior changes
**Depends on**: Phase 6
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05
**Success Criteria** (what must be TRUE):
  1. Each audit category (color, typography, spacing, components) lives in its own module with a typed interface — a test can import and exercise it in isolation
  2. Export/inject logic is a separate module that audit modules call through a typed contract — changing injection does not require touching audit code
  3. The MCP server adaptation layer is separated from shared audit types — MCP tool changes do not propagate into the plugin
  4. Parsing and serialization are separated into their own module — chunk reconstruction and schema validation are independently testable
  5. UI state management is a standalone layer — React components receive state as props and dispatch actions through typed handlers, not by reading plugin globals directly
**Plans**: 4 plans

Plans:
- [ ] 07-01-PLAN.md — AuditNode* interfaces + update 6 auditors (ARCH-01 core)
- [ ] 07-02-PLAN.md — Auditor tests + serialize.ts extraction + shared types (ARCH-01 tests + ARCH-02)
- [ ] 07-03-PLAN.md — MCP adapter layer + chunk-reader split + tests (ARCH-03 + ARCH-04)
- [ ] 07-04-PLAN.md — UI state.ts + useAppMessages.ts + App.tsx refactor (ARCH-05)

### Phase 8: UI v2 Base
**Goal**: The plugin renders three screens that are pixel-faithful to the Figma Audit-1, Audit-2, and Config-1 frames, using a shared state layer and covering all global UI states
**Depends on**: Phase 7
**Requirements**: UIS-01, UIS-02, UIS-03, UIS-04, UIX-07
**Success Criteria** (what must be TRUE):
  1. Opening the plugin with no prior audit shows the Audit-1 empty state: welcome message, subtitle, and primary CTA — matching the Figma frame layout exactly
  2. After an audit completes, the Audit-2 results state renders: status banners, metric cards, finding text, accordion categories, and primary CTA — matching Figma Audit-2 exactly
  3. The Configuration tab renders numbered MCP setup steps, code block, repo link, and tools list — matching Figma Config-1 exactly
  4. The visual language is consistent across all screens: tabs at top, primary CTA at bottom, monospaced font, minimal style, generous whitespace
  5. All global UI states are reachable and render correctly: empty, loading, success, warning, error, no SVG available, component not found
**Plans**: 4 plans

Plans:
- [x] 08-01-PLAN.md — tokens.ts + Tab rename to 'config' + code.ts window resize (UIS-04, UIX-07 foundation)
- [x] 08-02-PLAN.md — 6 atomic components: Tabs, Button, StatusBanner, MetricCard, Accordion, AccordionItem
- [x] 08-03-PLAN.md — AuditView (all 5 states) + ConfigView + App.tsx rewrite
- [x] 08-04-PLAN.md — Plugin build + human visual verification checkpoint

### Phase 9: Audit Flow v2
**Goal**: The audit flow shows streaming progress in real time, detects and classifies unpublished/private components, and displays AI Context sync status — with streaming events flowing from MCP through the plugin
**Depends on**: Phase 8
**Requirements**: UIX-01, UIX-02, UIX-03, UNPB-01, UNPB-02, UNPB-03, STRM-01, STRM-02, STRM-03
**Success Criteria** (what must be TRUE):
  1. When an audit runs, the plugin shows a streaming active state with a real-time progress indicator that updates as audit steps complete
  2. The Audit results state includes a count of unpublished/private components, clearly labelled and visually distinct from published component counts
  3. The AI Context status (injected / outdated / missing) is visible in Audit results and reflects the actual state of plugin data
  4. Calling `get_audit_summary` in an IDE receives streaming events in sequence: start, progress, chunk, end — and error events on failure
  5. Each streaming chunk is a complete, independently parseable unit — reading chunk N does not require chunk N-1
  6. An IDE that does not support streaming receives the full audit summary in a single no-stream fallback response
**Plans**: 4 plans

Plans:
- [ ] 09-01-PLAN.md - Shared type contracts (publishStatus, unpublishedComponents, contextStatus, AppState fields)
- [ ] 09-02-PLAN.md - Unpublished component detection in sandbox audit
- [ ] 09-03-PLAN.md - MCP streaming for get_audit_summary (start/progress/chunk/end events)
- [ ] 09-04-PLAN.md - UI wiring: progress bar, unpublished badge, contextStatus banner, extended JSON export

### Phase 10: Configuration Flow v2
**Goal**: The Configuration tab shows live connection status, CSS framework selection, export status with re-injection guidance, and a full MCP capability summary including new v2 tools
**Depends on**: Phase 8
**Requirements**: UIX-04, UIX-05, UIX-06
**Success Criteria** (what must be TRUE):
  1. The Configuration tab shows which CSS framework is selected and the currently connected Figma file key, with a clear connected/disconnected status indicator
  2. The Configuration tab shows export status and, when data is outdated or missing, displays actionable re-injection guidance that tells the user exactly what to do
  3. The Configuration tab links to the MCP capability summary in the GitHub repo and the MCP tools section copy is correct and complete
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Type contracts: FILE_KEY message, fileKey AppState slice, SET_FILE_KEY reducer
- [ ] 10-02-PLAN.md — ConfigView extension: CSS framework dropdown, file key row, export status banner, MCP copy fix + human verify

### Phase 11: MCP Component Tools
**Goal**: `get_component_specs` returns computed visual properties with per-state variants and source/origin metadata; `get_component_svg` returns serialized SVG with metadata and a clear error for non-extractable assets
**Depends on**: Phase 7
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SVG-01, SVG-02, SVG-03
**Success Criteria** (what must be TRUE):
  1. Calling `get_component_specs` with a component name returns computed visual properties: width, height, paddingX, paddingY, borderRadius, background, textColor, borderColor
  2. When a component has interaction states, `get_component_specs` returns a per-state breakdown (default, hover, pressed, disabled) for each computed property
  3. Each property in the `get_component_specs` output includes source/origin metadata identifying whether the value came from a variable, alias, or was computed directly
  4. Calling `get_component_svg` with a logo, mark, or icon name returns the serialized SVG markup along with name, type, and viewBox metadata
  5. Calling `get_component_svg` with an interactive or non-SVG-extractable component returns a clear, descriptive error explaining why SVG is not available
**Plans**: TBD

**⚠️ Research Required — Component Data Source Strategy**

The current `ComponentSpec` in `setPluginData` is a stub (`variants: []`, `props: []`, `usageCount: 0`). Phase 11 must decide how to provide pixel-perfect component data to the MCP. Two candidate approaches must be researched and the most robust one selected before planning:

- **Option A — Serialize in plugin during audit**: The plugin already has full node access at audit time. Extract visual properties (fills, padding, borderRadius, effects, interaction states) per component and include them in `setPluginData` chunks. Zero additional REST API calls. Risk: 100kB-per-key chunk limit may be exceeded for large design systems — requires measurement.

- **Option B — Single batch REST API call at cache load**: When `ensureLoaded()` fetches the file, add one `GET /v1/files/:key/nodes?ids=id1,id2,...` call with all component IDs. Still one extra call per session, consistent with the existing cache architecture. Risk: adds REST API dependency and one extra rate-limit-counted call per session.

**Constraint**: On-demand per-component REST API calls are NOT acceptable — free Figma users are subject to strict monthly rate limits, and the architecture decision (single call per file per session + in-memory cache) must be preserved. The chosen approach must respect this constraint.

GSD research agent must evaluate both options against: (1) payload size impact on chunking, (2) rate limit safety for free users, (3) data freshness, and (4) implementation complexity — and produce a concrete recommendation before planning begins.

### Phase 12: Hardening
**Goal**: All UX copy is consistent and reviewed, button states are valid across every flow, audit/inject/export synchronization is correct, every error condition has a descriptive message, naming is consistent across packages, and all flows have defined loading and error states
**Depends on**: Phase 9, Phase 10, Phase 11
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06
**Success Criteria** (what must be TRUE):
  1. Every text string in the plugin (labels, CTAs, status messages, error messages, tooltips) uses the same terminology and tone throughout all states and flows
  2. Every button in every flow is in a valid state — no enabled buttons that produce no action, no disabled buttons that should be enabled, and loading states are shown during async operations
  3. Running an audit, then injecting, then exporting produces consistent, correct results — no stale data, no sync mismatches between the plugin UI and the MCP payload
  4. Every error condition surfaces a descriptive, actionable message — the user is never shown a raw error code or a generic failure message
  5. Shared type names, plugin data keys, and MCP tool parameter names are consistent across the plugin, shared package, and MCP server — no divergence
**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 6 → 7 → 8 → 9 → 10 → 11 → 12
(Note: Phase 10 depends on Phase 8; Phase 11 depends on Phase 7. Both can start after their respective dependencies complete.)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-03 |
| 2. Audit Engine | v1.0 | 3/3 | Complete | 2026-03-03 |
| 3. Data Injection & Plugin UI | v1.0 | 3/3 | Complete | 2026-03-03 |
| 4. MCP Server | v1.0 | 3/3 | Complete | 2026-03-04 |
| 5. Integration & Polish | v1.0 | 3/3 | Complete | 2026-03-05 |
| 6. Discovery & Architecture Decisions | v2.0 | 0/TBD | Not started | - |
| 7. Architecture Refactor | v2.0 | 4/4 | Complete | 2026-03-10 |
| 8. UI v2 Base | v2.0 | 4/4 | Complete | 2026-03-12 |
| 9. Audit Flow v2 | 4/4 | Complete    | 2026-03-14 | - |
| 10. Configuration Flow v2 | v2.0 | 0/TBD | Not started | - |
| 11. MCP Component Tools | v2.0 | 0/TBD | Not started | - |
| 12. Hardening | v2.0 | 0/TBD | Not started | - |
