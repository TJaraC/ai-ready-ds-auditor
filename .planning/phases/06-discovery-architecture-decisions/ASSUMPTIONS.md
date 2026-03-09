# Phase 6 Discovery: Assumptions

**Date:** 2026-03-09
**Status:** Locked for Phases 7-12 unless overridden by user

These are assumptions made during Phase 6 discovery. Each assumption is either validated by evidence or explicitly flagged as needing confirmation in a specific phase.

---

## Architecture Assumptions

### A-01: Plugin-side Figma types remain structurally compatible with AuditNode* interfaces
- **Assumption:** `SceneNode`, `TextNode`, `FrameNode` etc. are structural supertypes of the `AuditNode*` interfaces defined in ARCH-01. No runtime transformation needed — just a narrowing cast.
- **Confidence:** High — Figma plugin types are structural in TypeScript
- **Risk if wrong:** Auditors need defensive property access guards
- **Validation:** TypeScript compiler will error if incompatible in Phase 7

### A-02: CJS module system stays for MCP server
- **Assumption:** The MCP server continues using CommonJS (`"type": "commonjs"` in `package.json`). ESM migration is out of scope for v2.0.
- **Confidence:** High — explicitly decided in v1.0, no new reason to change
- **Risk if wrong:** All import/require patterns need updating across the package

### A-03: MCP SDK v1.27.x supports progress notifications via `RequestHandlerExtra`
- **Assumption:** The `@modelcontextprotocol/sdk@1.27.x` provides a way to send `notifications/progress` from within a tool handler (via extra parameter or server method).
- **Confidence:** Medium — MCP spec defines progress notifications, but the exact SDK API surface must be verified
- **Validation:** Phase 9 researcher must inspect `@modelcontextprotocol/sdk/server/mcp.js` types before implementing streaming
- **Fallback:** If progress API doesn't exist, use `server.notification()` directly

### A-04: `figma.mixed` is always a Symbol in the plugin runtime
- **Assumption:** `figma.mixed` can be represented as `symbol` in TypeScript interfaces for test-time purposes
- **Confidence:** High — established pattern in v1.0 codebase

### A-05: `useReducer` is sufficient for UI state complexity
- **Assumption:** The v2.0 state shape fits in a single flat reducer without needing context splitting or nested reducers
- **Confidence:** Medium — v2.0 adds ~5 new state fields over v1.0; total state < 20 fields
- **Risk if wrong:** May need context splitting in Phase 9 if streaming state becomes complex

---

## UI/Figma Assumptions

### A-06: Plugin window width should be 592px in v2.0
- **Assumption:** The Figma design is at 1× density (not 2×), and the plugin window needs to be resized from 320px to 592px to render pixel-faithful designs
- **Confidence:** Medium — inferred from component sizes (accordion at 570px doesn't fit 320px)
- **MUST CONFIRM with user before Phase 8 starts**
- **Fallback if 320px:** Scale all design dimensions by 0.541 — this changes the design significantly

### A-07: Plugin height should be ~600px with vertical scroll
- **Assumption:** Audit-2 (1581px tall) and Audit-1 (964px tall) overflow the window — content scrolls inside the body area. Config-1 (907px) may fit depending on header/footer layout.
- **Confidence:** Medium — standard plugin UX pattern
- **MUST CONFIRM with user before Phase 8 starts**

### A-08: The component token values are final (no Figma Variables override)
- **Assumption:** Colors extracted from component fills (#F55442, #2B3C35, etc.) are the actual token values, not overridden by Figma Variables
- **Confidence:** Low — the file may use Figma Variables. Phase 8 must call `GET /v1/files/{key}/variables/local`
- **Risk if wrong:** All hardcoded token values in this spec are wrong

### A-09: The "Export" page components are the design system components for the plugin UI
- **Assumption:** The `tabs`, `button`, `status`, `card`, `Accordion`, `accordionItem` component sets in the "Export" page are the ones used in the plugin UI frames
- **Confidence:** High — these are the only component sets in the file, and they directly match the v1.0 UI elements

### A-10: Font is JetBrains Mono or similar monospace
- **Assumption:** The plugin UI uses a monospace font throughout, consistent with v1.0 visual language
- **Confidence:** Medium — v1.0 used a monospace font; confirmed by visual language requirement
- **Validation:** Phase 8 API call to `/v1/files/{key}/styles` will reveal the exact font

---

## MCP/Streaming Assumptions

### A-11: `get_audit_summary` is the only tool that needs streaming in v2.0
- **Assumption:** `get_component_specs` and `get_component_svg` return small enough payloads that streaming is not needed
- **Confidence:** High — component specs are single objects; SVG for icons is typically <50KB

### A-12: Non-stream fallback detection via `_meta.progressToken` absence
- **Assumption:** If the MCP client doesn't send a `progressToken` in `_meta`, the server skips streaming and returns a single `CallToolResult`
- **Confidence:** High — this is the standard MCP pattern for optional progress

### A-13: Each audit category fits in one streaming chunk (max ~500 issues)
- **Assumption:** For typical design systems, one category (e.g., color issues) has <500 issues, making one chunk per category safe for memory and latency
- **Confidence:** Medium — large design systems could have thousands of color issues
- **Risk if wrong:** Phase 9 must implement sub-chunk splitting within a category

---

## Package/Build Assumptions

### A-14: Vite config doesn't need changes for ARCH-01/02/05
- **Assumption:** The new files created in ARCH-01 (`audit-inputs.ts`), ARCH-02 (`serialize.ts`), and ARCH-05 (`state.ts`, `useAppMessages.ts`) are automatically included via TypeScript module resolution
- **Confidence:** High — Vite follows TS module resolution

### A-15: `@figma/plugin-typings@1.123.0` already includes all needed node types
- **Assumption:** The existing typings package covers `SceneNode`, `FrameNode`, `TextNode`, etc. as required by ARCH-01 interface definitions
- **Confidence:** High — v1.0 compiled without issues against this version

---

## Confirmed Non-Assumptions (Facts)

These are not assumptions — they are confirmed facts from v1.0:
- CJS for MCP server (confirmed, ESM had resolution issues)
- `setPluginData` 100kB limit per key (confirmed, Figma docs)
- `figma.loadAllPagesAsync()` required before `documentchange` handler (confirmed, v1.0 comment)
- `optional catch binding (catch {})` rejected by Figma parser (confirmed, v1.0 workaround in use)
- `cornerRadius` figma.mixed skipped (confirmed, v1.0 comment)
- `checksum` field in `AuditMeta` is always `''` (confirmed, v1.0 comment)
- Plugin ID `1610802699324330019` (confirmed, used in MCP client.ts)
