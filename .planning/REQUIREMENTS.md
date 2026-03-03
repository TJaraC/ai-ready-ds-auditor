# Requirements: AI-Ready Design System Auditor

**Defined:** 2026-03-02
**Core Value:** Any Non-Enterprise Figma user can connect their Design System to a local AI IDE in under 5 minutes, get live sync indicators, and give the AI full structured context — for free.

## v1 Requirements

### Infrastructure & Foundation (INFRA)

- [x] **INFRA-01**: Project is structured as an npm workspaces monorepo with three packages: `packages/shared`, `packages/plugin`, `packages/mcp-server`
- [x] **INFRA-02**: Shared types package (`packages/shared`) exports: `AuditReport`, `AuditMeta`, `DesignToken`, `ComponentSpec`, chunking constants, and `schemaVersion`
- [x] **INFRA-03**: TypeScript strict mode enabled across all packages (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- [x] **INFRA-04**: TypeScript project references configured between packages (shared → plugin, shared → mcp-server)
- [x] **INFRA-05**: ESLint configured with TypeScript rules + rule banning `console.log` in `packages/mcp-server` (stdio transport safety)
- [x] **INFRA-06**: Prettier configured with consistent code style across all packages
- [x] **INFRA-07**: Root-level npm scripts: `dev`, `build`, `lint`, `type-check`, `test`

### Figma Plugin — Build & Scaffold (PLUG)

- [x] **PLUG-01**: Vite configured to produce dual-build output: `code.js` (sandbox) + `ui.html` (single-file inlined iframe)
- [x] **PLUG-02**: `vite-plugin-singlefile` (or equivalent) inlines all UI assets into a single `ui.html` file
- [x] **PLUG-03**: `@figma/plugin-typings` installed and applied to `code.ts` (sandbox TypeScript)
- [x] **PLUG-04**: Typed message protocol defined via shared discriminated union types between sandbox and UI
- [x] **PLUG-05**: Plugin manifest (`manifest.json`) configured with correct permissions, name, and entry points
- [x] **PLUG-06**: Hot-reload development workflow functional (`npm run dev` in plugin package)

### Figma Plugin — Audit Engine (AUDIT)

- [ ] **AUDIT-01**: Audit engine traverses full scene graph of the active Figma document
- [ ] **AUDIT-02**: Color auditor detects fills and strokes using raw hex/rgb values instead of bound Figma variables or color styles
- [ ] **AUDIT-03**: Typography auditor detects text nodes with hardcoded `fontSize` and `fontWeight` not bound to text styles or variables
- [ ] **AUDIT-04**: Spacing auditor detects auto-layout nodes with hardcoded `paddingLeft/Right/Top/Bottom` and `itemSpacing` not using spacing variables
- [ ] **AUDIT-05**: Component auditor detects frame/group layers that match the size/shape of existing components but are not instances
- [x] **AUDIT-06**: Each audit result includes: node ID, node name, page name, issue type, offending value, and suggested fix
- [x] **AUDIT-07**: Audit engine produces a typed `AuditReport` conforming to shared types schema
- [ ] **AUDIT-08**: Audit supports progress reporting to the UI during long scans
- [x] **AUDIT-09**: Every `AuditReport` includes a `schemaVersion` field for forward compatibility

### Figma Plugin — Data Injection & Sync (DATA)

- [ ] **DATA-01**: Audit results are serialized to JSON and injected into the Figma document via `figma.root.setPluginData()`
- [ ] **DATA-02**: If serialized JSON exceeds 90kB, it is split into chunks stored under keys `ai_data_1`, `ai_data_2`, etc.
- [ ] **DATA-03**: A metadata key `ai_data_meta` stores chunk count, total byte size, schema version, and last-updated timestamp
- [ ] **DATA-04**: Before writing new chunks, all existing `ai_data_*` keys are cleared to prevent stale data corruption
- [ ] **DATA-05**: Chunk sizes are measured using `TextEncoder` for byte-accurate counting (not character counting)
- [ ] **DATA-06**: Plugin listens to `figma.on("documentchange")` with a 2-second debounce
- [ ] **DATA-07**: When relevant changes are detected (component/style/variable modifications), UI receives a sync-outdated message
- [ ] **DATA-08**: UI displays a visual "Out of Sync" indicator when data is outdated since last injection

### Figma Plugin — UI (UI)

- [ ] **UI-01**: Plugin has two tabs: "Audit & Inject" and "AI Context"
- [ ] **UI-02**: "Audit & Inject" tab shows a health dashboard: total components, total tokens, audit issue count by category, overall health score
- [ ] **UI-03**: "Audit & Inject" tab has a primary "Inject / Update" button that triggers a full scan and data injection
- [ ] **UI-04**: Each audit issue in the dashboard is clickable and navigates Figma's canvas to the offending node (click-to-select)
- [ ] **UI-05**: "AI Context" tab has a CSS framework selector: Tailwind CSS, CSS Variables, CSS Modules, Styled Components/Emotion
- [ ] **UI-06**: "AI Context" tab has a button to export the injected JSON to a local file
- [ ] **UI-07**: "AI Context" tab displays the Figma File ID and metadata fields needed to configure the MCP server
- [ ] **UI-08**: All async operations show clear loading states
- [ ] **UI-09**: All error conditions show clear, actionable error messages (not raw error objects)
- [ ] **UI-10**: Plugin UI bundle size stays under 200kB gzipped

### MCP Server — Core (MCP)

- [ ] **MCP-01**: MCP server runs as a local Node.js process using `@modelcontextprotocol/sdk` with `StdioServerTransport`
- [ ] **MCP-02**: On session start, server makes exactly one `GET /v1/files/:file_key` API call per configured Figma file
- [ ] **MCP-03**: Server reconstructs chunked JSON from `ai_data_meta` + `ai_data_1`, `ai_data_2`, etc. keys
- [ ] **MCP-04**: Reconstructed Design System data is stored in an in-memory cache (`Map<fileKey, CachedData>`)
- [ ] **MCP-05**: Server supports multiple Figma files loaded simultaneously (multi-file cache)
- [ ] **MCP-06**: Server does not make redundant Figma API calls while cached data is valid
- [ ] **MCP-07**: All `console.log()` calls in server code are replaced with `console.error()` to prevent stdio transport corruption
- [ ] **MCP-08**: Figma API responses are fully typed (no `any` in API client code)
- [ ] **MCP-09**: Internal data structures (cache entries, tool responses) are fully typed

### MCP Server — Error Handling (ERR)

- [ ] **ERR-01**: If Figma API returns 403, server returns a structured error with: error type, file key, and step-by-step instructions to set file sharing to "Anyone with the link can view"
- [ ] **ERR-02**: If Figma API returns 429 (rate limit), server implements exponential backoff and retries
- [ ] **ERR-03**: If chunk reconstruction fails (missing keys, corrupted data), server returns a structured error with recovery instructions (re-run injection from plugin)
- [ ] **ERR-04**: If `schemaVersion` is unknown/unsupported, server returns a structured error with version mismatch details

### MCP Server — Tools (TOOL)

- [ ] **TOOL-01**: Tool `get_design_tokens` accepts optional `fileKey` and `framework` parameters; returns color, typography, and spacing tokens formatted for the selected CSS framework
- [ ] **TOOL-02**: Tool `get_component_specs` accepts `componentName` or `componentId` parameter; returns full component specification including props, variants, and usage notes
- [ ] **TOOL-03**: Tool `get_audit_summary` accepts optional `fileKey` and `category` filter; returns structured audit issues with node IDs, issue types, and suggested fixes
- [ ] **TOOL-04**: All tool input schemas are validated with `zod` before processing
- [ ] **TOOL-05**: All tool responses conform to typed interfaces exported from `packages/shared`

### MCP Server — CSS Framework Output (FMT)

- [ ] **FMT-01**: Token formatter for Tailwind CSS outputs a `tailwind.config.js`-compatible theme object
- [ ] **FMT-02**: Token formatter for CSS Variables outputs `:root { --token-name: value; }` declarations
- [ ] **FMT-03**: Token formatter for CSS Modules outputs typed module definitions with `:export` blocks
- [ ] **FMT-04**: Token formatter for Styled Components/Emotion outputs a typed `theme` object for `ThemeProvider`

## v2 Requirements

### Audit Enhancements

- **AUDIT-V2-01**: Severity classification for audit issues (critical vs warning vs info)
- **AUDIT-V2-02**: Component variant mapping (full prop type extraction for AI code generation)
- **AUDIT-V2-03**: Page/frame scope selection (audit only selected pages or frames)
- **AUDIT-V2-04**: Custom lint rule engine (user-defined audit rules)

### MCP Server Enhancements

- **MCP-V2-01**: Cache TTL with configurable expiration and manual invalidation command
- **MCP-V2-02**: Tool `list_figma_files` to enumerate configured files and cache status
- **MCP-V2-03**: Selective token export by collection or group
- **MCP-V2-04**: HTTP/SSE transport option alongside stdio (for web-based IDE integrations)

### Plugin UI Enhancements

- **UI-V2-01**: Export/copy audit results as CSV or formatted markdown
- **UI-V2-02**: Results filtering by page, component, or issue type
- **UI-V2-03**: Comparison mode (diff between two audit snapshots)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Figma write-back / auto-fix | Modifying designs from MCP creates complex undo/redo issues; read-only in v1 |
| Real-time WebSocket sync | Pull-based cache model is correct for v1; real-time sync multiplies complexity |
| Cloud-hosted MCP server | Local-only is the core value proposition (free, private, no auth needed) |
| Token sync to code repositories | Out-of-scope for DesignOps audit tool; separate tooling responsibility |
| Multi-tool support (Sketch, Adobe XD) | Figma-first; other tools may not have equivalent plugin APIs |
| Figma Enterprise features | Non-Enterprise only -- Enterprise has native solutions |
| OAuth / Figma OAuth flow | Personal access token is sufficient for free tier; OAuth is unnecessary complexity |
| Native mobile companion app | Desktop IDEs (Trae, Cursor) are the target; mobile is v3+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1: Foundation | Complete |
| INFRA-02 | Phase 1: Foundation | Complete |
| INFRA-03 | Phase 1: Foundation | Complete |
| INFRA-04 | Phase 1: Foundation | Complete |
| INFRA-05 | Phase 1: Foundation | Complete |
| INFRA-06 | Phase 1: Foundation | Complete |
| INFRA-07 | Phase 1: Foundation | Complete |
| PLUG-01 | Phase 1: Foundation | Complete |
| PLUG-02 | Phase 1: Foundation | Complete |
| PLUG-03 | Phase 1: Foundation | Complete |
| PLUG-04 | Phase 1: Foundation | Complete |
| PLUG-05 | Phase 1: Foundation | Complete |
| PLUG-06 | Phase 1: Foundation | Complete |
| AUDIT-01 | Phase 2: Audit Engine | Pending |
| AUDIT-02 | Phase 2: Audit Engine | Pending |
| AUDIT-03 | Phase 2: Audit Engine | Pending |
| AUDIT-04 | Phase 2: Audit Engine | Pending |
| AUDIT-05 | Phase 2: Audit Engine | Pending |
| AUDIT-06 | Phase 2: Audit Engine | Complete |
| AUDIT-07 | Phase 2: Audit Engine | Complete |
| AUDIT-08 | Phase 2: Audit Engine | Pending |
| AUDIT-09 | Phase 2: Audit Engine | Complete |
| DATA-01 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-02 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-03 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-04 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-05 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-06 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-07 | Phase 3: Data Injection & Plugin UI | Pending |
| DATA-08 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-01 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-02 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-03 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-04 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-05 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-06 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-07 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-08 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-09 | Phase 3: Data Injection & Plugin UI | Pending |
| UI-10 | Phase 3: Data Injection & Plugin UI | Pending |
| MCP-01 | Phase 4: MCP Server | Pending |
| MCP-02 | Phase 4: MCP Server | Pending |
| MCP-03 | Phase 4: MCP Server | Pending |
| MCP-04 | Phase 4: MCP Server | Pending |
| MCP-05 | Phase 4: MCP Server | Pending |
| MCP-06 | Phase 4: MCP Server | Pending |
| MCP-07 | Phase 4: MCP Server | Pending |
| MCP-08 | Phase 4: MCP Server | Pending |
| MCP-09 | Phase 4: MCP Server | Pending |
| ERR-01 | Phase 4: MCP Server | Pending |
| ERR-02 | Phase 4: MCP Server | Pending |
| ERR-03 | Phase 4: MCP Server | Pending |
| ERR-04 | Phase 4: MCP Server | Pending |
| TOOL-01 | Phase 4: MCP Server | Pending |
| TOOL-02 | Phase 4: MCP Server | Pending |
| TOOL-03 | Phase 4: MCP Server | Pending |
| TOOL-04 | Phase 4: MCP Server | Pending |
| TOOL-05 | Phase 4: MCP Server | Pending |
| FMT-01 | Phase 4: MCP Server | Pending |
| FMT-02 | Phase 4: MCP Server | Pending |
| FMT-03 | Phase 4: MCP Server | Pending |
| FMT-04 | Phase 4: MCP Server | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Phase 5 (Integration & Polish): Cross-cutting validation, no new requirements
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation*
