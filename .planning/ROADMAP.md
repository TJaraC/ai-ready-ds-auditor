# Roadmap: AI-Ready Design System Auditor

## Milestones

- [x] **v1.0 MVP** - Phases 1-5 (shipped 2026-03-05)
- [x] **v2.0 Figma-Faithful UI + Enhanced MCP** - Phases 6-13 (shipped 2026-03-19)
- [ ] **v2.1 Usability & Performance** - Phase 14 (in progress)
- [ ] **v2.2 Icon Detection & Audit** - Phase 15 (planned)

## Phases

- [ ] **Phase 14: Usability & Performance** - Performance verification, audit scope toggles, and first-use onboarding
- [ ] **Phase 15: Icon Detection & Audit** - Detect and audit icon usage consistency with toggleable scope control

## Phase Details

### Phase 14: Usability & Performance
**Goal**: Users control what gets audited and experience smooth performance on large design systems
**Depends on**: Phase 13 (v2.0 complete)
**Requirements**: PERF-01, PERF-02, SCOPE-01, SCOPE-02, SCOPE-03, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Plugin completes a full audit on a 500+ component design system (e.g., Material 3) without freezing the UI
  2. User can toggle individual audit categories (colors, typography, spacing, disconnected components) on/off from the Config view, and the audit respects those toggles by skipping disabled categories entirely
  3. Scope configuration survives plugin close/reopen -- toggling a category off, closing the plugin, and reopening shows the same toggle state
  4. On first launch with no prior config or injected data, the Audit dashboard shows a dedicated first-use state with a CTA that navigates to Config
  5. Running "Scan Only" (START_SCAN) does not trigger SVG exports -- only "Inject AI Data" exports SVGs
**Plans:** 1/2 plans executed

Plans:
- [ ] 14-01-PLAN.md -- Types, state, audit filtering, and tests for scope config + performance fix
- [ ] 14-02-PLAN.md -- Sandbox wiring, toggle UI, first-use screen, App.tsx integration

### Phase 15: Icon Detection & Audit
**Goal**: Users can optionally audit icon usage consistency — size scales, color tokens, and disconnected raw vectors — with a scope toggle that prevents data bloat on icon-heavy design systems
**Depends on**: Phase 14
**Requirements**: ICON-01, ICON-02, ICON-03, ICON-04, ICON-05, ICON-06, ICON-07, ICON-08
**Success Criteria** (what must be TRUE):
  1. The plugin detects icon nodes via name patterns (`icon/`, `Icon/`, `ic_`, etc.) and icon font families (Material Icons, Font Awesome, etc.)
  2. The plugin detects disconnected vector icons: small square frames (16–48 px) containing only paths that are not component instances
  3. The audit reports icon size inconsistencies (sizes outside 16/20/24/32/40/48 scale) and hardcoded fill colors on icon nodes
  4. A new `icons` toggle appears in the Audit Scope section, disabled by default; when disabled, zero icon nodes are processed
  5. The MCP server exposes icon audit results in its response schema
**Plans:** 1/2 plans executed

Plans:
- [ ] 15-01-PLAN.md -- Add 'icon' category to all type unions, ScopeConfig, ConfigView toggle, MCP enums, AuditNodeIcon interface
- [ ] 15-02-PLAN.md -- TDD icon detection predicates + audit functions, wire into PASS 2 traversal loop

## Progress

**Execution Order:**
Phase 14 → Phase 15

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Usability & Performance | 1/2 | In Progress|  | - |
| 15. Icon Detection & Audit | 1/2 | In Progress|  | - |
