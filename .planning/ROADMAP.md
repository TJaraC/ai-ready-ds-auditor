# Roadmap: AI-Ready Design System Auditor

## Milestones

- [x] **v1.0 MVP** - Phases 1-5 (shipped 2026-03-05)
- [x] **v2.0 Figma-Faithful UI + Enhanced MCP** - Phases 6-13 (shipped 2026-03-19)
- [ ] **v2.1 Usability & Performance** - Phase 14 (in progress)

## Phases

- [ ] **Phase 14: Usability & Performance** - Performance verification, audit scope toggles, and first-use onboarding

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

## Progress

**Execution Order:**
Phase 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Usability & Performance | 1/2 | In Progress|  | - |
