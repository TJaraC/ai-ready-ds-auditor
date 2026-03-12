# Requirements: AI-Ready DS Auditor

**Defined:** 2026-03-06
**Milestone:** v2.0 — Figma-Faithful UI + Enhanced MCP
**Core Value:** Any Non-Enterprise Figma user can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators, and give the AI full structured context — for free.

---

## v2.0 Requirements

Requirements for v2.0 release. Each maps to a roadmap phase.

### UI — Core Structure (UIS)

- [ ] **UIS-01**: User sees Audit tab empty state (welcome message, subtitle, primary CTA) matching Figma Audit-1 frame exactly
- [ ] **UIS-02**: User sees Audit tab results state (status banners, metric cards, finding text, accordion categories, primary CTA) matching Figma Audit-2 frame exactly
- [ ] **UIS-03**: User sees Configuration tab (numbered MCP setup steps, code block, repo link, tools list, primary CTA) matching Figma Config-1 frame exactly
- [x] **UIS-04**: User sees consistent visual language throughout: tabs on top, primary CTA bottom, monospaced font, minimal style, generous whitespace

### UI — v2 Extensions (UIX)

- [ ] **UIX-01**: User sees streaming active state with real-time progress indicator during audit
- [ ] **UIX-02**: User sees unpublished/private component count in Audit results
- [ ] **UIX-03**: User sees AI Context status summary (injected / outdated / missing) in Audit results
- [ ] **UIX-04**: User sees CSS framework selection and active file key / connection status in Configuration
- [ ] **UIX-05**: User sees export status and re-injection guidance in Configuration
- [ ] **UIX-06**: User sees MCP capability summary and new tools list in Configuration (get_component_specs, get_component_svg, streaming, unpublished scan)
- [x] **UIX-07**: User sees all global UI states across flows: empty, loading, success, warning, error, no SVG available, component not found

### MCP — Component Specs (SPEC)

- [ ] **SPEC-01**: User can call `get_component_specs` with a component name and receive computed visual properties (width, height, paddingX, paddingY, borderRadius, background, textColor, borderColor)
- [ ] **SPEC-02**: User can receive per-state properties (default, hover, pressed, disabled) from `get_component_specs` when states exist in the component
- [ ] **SPEC-03**: User can see source/origin metadata per property (variable, alias, computed) in `get_component_specs` output

### MCP — SVG Extraction (SVG)

- [ ] **SVG-01**: User can call `get_component_svg` and receive serialized SVG markup for non-interactive assets (logos, marks, icons)
- [ ] **SVG-02**: User receives SVG metadata (name, type, viewBox) alongside the SVG string
- [ ] **SVG-03**: User receives a clear, descriptive error when the requested asset is not SVG-extractable

### MCP — Streaming (STRM)

- [ ] **STRM-01**: User receives streaming events (start, progress, chunk, end, error) when calling `get_audit_summary`
- [ ] **STRM-02**: User can receive the full audit summary in a no-stream fallback mode when streaming is not supported
- [ ] **STRM-03**: Streaming chunks are individually parseable without dependency on adjacent chunks

### MCP — Unpublished Detection (UNPB)

- [ ] **UNPB-01**: Audit detects and classifies each component as published, private, or local/unpublished
- [ ] **UNPB-02**: Unpublished/private component status is included in the audit payload and exposed through MCP tools
- [ ] **UNPB-03**: Unpublished component count and classification is visible in the plugin UI Audit results

### Architecture Refactor (ARCH)

- [x] **ARCH-01**: Audit logic is split into discrete, independently testable modules with clear interfaces
- [x] **ARCH-02**: Export/inject logic is separated from audit logic with a stable, typed interface
- [x] **ARCH-03**: MCP adaptation layer is separated from core audit data structures
- [x] **ARCH-04**: Parsing/serialization logic is separated and independently testable
- [x] **ARCH-05**: UI state management is separated from rendering components

### Corrections & Hardening (FIX)

- [ ] **FIX-01**: All UI copy is consistent and reviewed across all states and flows
- [ ] **FIX-02**: Button states (disabled/enabled/loading) are valid and consistent across all flows
- [ ] **FIX-03**: Audit → inject → export synchronization errors are resolved
- [ ] **FIX-04**: All error conditions include descriptive, actionable messages
- [ ] **FIX-05**: Naming is consistent across plugin, shared types, and MCP tool contracts
- [ ] **FIX-06**: All flows have defined loading and error states

---

## v3 Requirements (Deferred)

### UI — Component Lookup Panels

- **CMLK-01**: User can look up computed specs for a component by name in the plugin UI
- **CMLK-02**: User can look up and preview SVG assets by name in the plugin UI

### MCP — Advanced

- **MCP-ADV-01**: MCP server can push updates to the IDE when the design system changes (requires WebSocket — explicitly deferred)
- **MCP-ADV-02**: `get_component_specs` supports batch lookup for multiple components in one call

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Figma Enterprise features | Non-Enterprise only, free tier focus |
| Cloud/server-hosted MCP | Local execution only — privacy, zero cost |
| Figma write-back from MCP | Read-only architecture in v1/v2 |
| Real-time WebSocket sync | Pull-based cache model, complexity too high |
| Native mobile app | Desktop IDEs only |
| Component lookup UI panel | Deferred to v3 — out of v2 scope |
| Per-corner border radius | figma.mixed complexity — skipped in v1, revisit v3 |
| OAuth for Figma auth in plugin | Plugin API uses direct Figma context, no auth needed |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UIS-01 | Phase 8 | Pending |
| UIS-02 | Phase 8 | Pending |
| UIS-03 | Phase 8 | Pending |
| UIS-04 | Phase 8 | Complete |
| UIX-01 | Phase 9 | Pending |
| UIX-02 | Phase 9 | Pending |
| UIX-03 | Phase 9 | Pending |
| UIX-04 | Phase 10 | Pending |
| UIX-05 | Phase 10 | Pending |
| UIX-06 | Phase 10 | Pending |
| UIX-07 | Phase 8 | Complete |
| SPEC-01 | Phase 11 | Pending |
| SPEC-02 | Phase 11 | Pending |
| SPEC-03 | Phase 11 | Pending |
| SVG-01 | Phase 11 | Pending |
| SVG-02 | Phase 11 | Pending |
| SVG-03 | Phase 11 | Pending |
| STRM-01 | Phase 9 | Pending |
| STRM-02 | Phase 9 | Pending |
| STRM-03 | Phase 9 | Pending |
| UNPB-01 | Phase 9 | Pending |
| UNPB-02 | Phase 9 | Pending |
| UNPB-03 | Phase 9 | Pending |
| ARCH-01 | Phase 7 | Complete |
| ARCH-02 | Phase 7 | Complete |
| ARCH-03 | Phase 7 | Complete |
| ARCH-04 | Phase 7 | Complete |
| ARCH-05 | Phase 7 | Complete |
| FIX-01 | Phase 12 | Pending |
| FIX-02 | Phase 12 | Pending |
| FIX-03 | Phase 12 | Pending |
| FIX-04 | Phase 12 | Pending |
| FIX-05 | Phase 12 | Pending |
| FIX-06 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 34 total
- Mapped to phases: 34 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after v2.0 roadmap creation — all 34 requirements mapped*
