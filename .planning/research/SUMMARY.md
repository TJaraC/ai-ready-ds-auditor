# Project Research Summary

**Project:** AI-Ready Design System Auditor
**Domain:** DesignOps -- Figma Plugin + Local MCP Server
**Researched:** 2026-03-02
**Confidence:** MEDIUM

## Executive Summary

This project builds two tightly coupled components: a Figma plugin that audits design systems for hardcoded values and structural issues, and a local MCP server that exposes the audit data to AI-powered IDEs (Cursor, Trae). The core innovation is the bridge between them -- the plugin injects structured JSON into the Figma file via `setPluginData()`, and the MCP server reads it via the Figma REST API. No existing tool occupies this niche. Competitors either audit-only (Design Lint), manage tokens only (Tokens Studio), or require Enterprise tier (Figma Dev Mode analytics). The combination of audit, structured injection, and MCP exposure is genuinely novel and targets the massive non-Enterprise Figma user base.

The recommended approach uses a simple npm-workspaces monorepo with three packages: shared types, Figma plugin (Vite + React), and MCP server (Node.js + official SDK). The Figma plugin has a unique dual-build constraint (sandbox code.js + UI iframe as single HTML), which is the trickiest build configuration. The MCP server uses stdio transport (spawned by IDE as a child process) and should make exactly one Figma REST API call per file, caching the result in memory. The shared types package enforces the data contract between plugin and server at compile time.

The top risks are: (1) the Figma plugin sandbox model is unusual and requires strict message-passing discipline from day one, (2) `setPluginData()` has a 100kB per-key limit requiring chunking to be built into the data layer from the start, (3) the MCP SDK and Figma API versions in research are from training data (May 2025 cutoff) and must be verified against current documentation before implementation, and (4) stdout pollution in the MCP server will silently corrupt the stdio transport. All of these are preventable with upfront architecture decisions rather than costly retrofits.

## Key Findings

### Recommended Stack

The stack splits cleanly between the Figma plugin (TypeScript + React + Vite) and the MCP server (TypeScript + Node.js + @modelcontextprotocol/sdk + zod). Both share a TypeScript types package via npm workspaces. The monorepo is deliberately simple -- no Nx or Turborepo, just workspace references and TypeScript project references.

**Core technologies:**
- **TypeScript ^5.5:** Strict mode with `noUncheckedIndexedAccess` -- required for safe Figma API response handling
- **React ^18 (verify ^19):** Plugin UI framework (project constraint); runs in iframe, not sandbox
- **Vite ^6 (verify ^7):** Dual-build for plugin (code.js + ui.html); `vite-plugin-singlefile` for inlining all assets
- **@modelcontextprotocol/sdk:** Official MCP implementation with `StdioServerTransport` -- the only serious option
- **zod ^3.23:** MCP SDK peer dependency for tool input schema definitions
- **@figma/plugin-typings:** Official type definitions for the `figma.*` sandbox API
- **vitest:** Test runner aligned with Vite toolchain

**Critical version caveat:** ALL version numbers are from training data (May 2025 cutoff). Every package version must be verified with `npm view <pkg> version` before installation. React 19, Vite 7, and MCP SDK updates are all plausible.

### Expected Features

**Must have (table stakes):**
- Hardcoded color, typography, and spacing detection (the "big three" audit categories)
- Disconnected component detection (structural issues)
- JSON injection with chunking (the bridge mechanism -- without this, MCP has nothing to read)
- Out of Sync indicator (`documentchange` with 2s debounce)
- Health dashboard UI with click-to-select navigation
- CSS framework selector (Tailwind, CSS variables, CSS Modules, styled-components)
- MCP server with 3 core tools: `get_design_tokens`, `get_component_specs`, `get_audit_summary`
- In-memory cache with chunk reconstruction and multi-file support
- Actionable 403 error handling (most common onboarding failure)

**Should have (differentiators for v1.x):**
- Severity classification for audit issues (critical vs minor)
- Component variant mapping (full prop type extraction for AI code gen)
- Selective token export by collection
- Page/frame scope selection
- Export/copy audit results

**Defer (v2+):**
- Write-back / auto-fix capabilities
- Custom lint rule engine
- Token sync to code repositories
- Real-time WebSocket sync (pull-based model is correct for v1)
- Cloud-hosted MCP server
- Multi-tool support (Sketch, Adobe XD, Penpot)

### Architecture Approach

The system has four runtime boundaries: plugin sandbox (V8, no DOM), plugin UI (iframe with React), Figma file storage (pluginData), and MCP server (Node.js stdio process). Communication between sandbox and UI is exclusively via typed `postMessage`. Communication between plugin and MCP server is indirect -- the plugin writes to the file, the MCP server reads via REST API. This pull-based, asynchronous bridge is deliberately simple and avoids the complexity of real-time sync.

**Major components:**
1. **Plugin Sandbox** (`code.ts` + `sandbox/`) -- Scene traversal, audit logic via modular auditors, data injection with chunking, change detection
2. **Plugin UI** (React iframe) -- Two tabs (Audit, AI Context), health dashboard, framework selector, sync indicator
3. **Shared Types** (`packages/shared/`) -- `AuditReport`, `AuditMeta`, `DesignToken`, `ComponentSpec` types; chunking constants; schema version
4. **MCP Server** (`packages/mcp-server/`) -- Figma REST API client, chunk reconstruction, in-memory cache (Map-based, TTL), three tool handlers, four CSS framework formatters
5. **Figma File Storage** -- Metadata key + ordered data chunks; 90kB chunk size with 10% safety margin

### Critical Pitfalls

1. **Sandbox/UI runtime confusion** -- The Figma plugin has two isolated execution contexts. All `figma.*` calls must be in `code.ts`; all DOM/React in the iframe. Establish the typed message protocol as the very first implementation task.
2. **`setPluginData` 100kB limit** -- Silent truncation on large design systems. Chunking must be built from day one, not retrofitted. Use `TextEncoder` for byte-accurate measurement, 90kB chunk size, metadata-first write pattern, and always clear old chunks before writing new ones.
3. **Figma REST API rate limits** -- Free tier is approximately 30 req/min. Use a single `GET /v1/files/:key` call (returns everything), cache aggressively, stagger multi-file loads, implement exponential backoff for 429 responses.
4. **MCP stdio transport corruption** -- Any `console.log()` in the MCP server corrupts the JSON-RPC protocol. Use `console.error()` exclusively. Enforce this with a lint rule.
5. **Schema versioning omission** -- Plugin and MCP server evolve independently. Include `schemaVersion` in every JSON payload from the first commit. MCP server must handle unknown versions gracefully.
6. **Bundle size in Figma iframe** -- React + heavy UI libraries can exceed what Figma's iframe handles comfortably. Target under 200kB gzipped. Use lightweight components, aggressive tree-shaking, and `vite-plugin-singlefile`.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation -- Monorepo, Shared Types, Plugin Scaffold
**Rationale:** Everything depends on the shared type definitions and the Figma plugin build pipeline. The dual-build Vite config (code.js + ui.html) is the trickiest setup and must be validated early. The typed message protocol between sandbox and UI prevents the most common Figma plugin bug.
**Delivers:** Working monorepo with builds passing; shared types defining `AuditReport`, `AuditMeta`, chunking constants with `schemaVersion`; plugin scaffold with sandbox/UI communication proven via round-trip test; Vite producing correct single-file HTML output.
**Addresses:** Project scaffolding, TypeScript strict mode, dual-build config, message protocol
**Avoids:** Sandbox/UI confusion (Pitfall 1), bundle size issues (Pitfall 7), missing schema versioning (Pitfall 6)

### Phase 2: Plugin Audit Engine
**Rationale:** The audit engine is the core novel code and the hardest to get right. It must run entirely in the Figma sandbox, handle variable/style resolution, and produce structured results. Building this before the MCP server means real audit data is available for MCP development.
**Delivers:** Four auditors (hardcoded colors, typography, spacing, disconnected components); scene graph traversal with progress reporting; variable and style resolution; `AuditReport` assembly.
**Addresses:** All four detection features, scan results summary, re-scan capability
**Avoids:** Monolithic code.ts (Architecture anti-pattern 2)

### Phase 3: Plugin Data Injection and UI
**Rationale:** With audit results available, this phase builds the injection pipeline (chunking, setPluginData, change detection) and the user-facing UI (health dashboard, framework selector, sync indicator). These are tightly coupled -- the UI displays what the engine produces and triggers injection.
**Delivers:** Chunked data injection with integrity checksums; Out of Sync indicator; health dashboard with click-to-select; CSS framework selector; two-tab UI (Audit, AI Context).
**Addresses:** JSON injection + chunking, Out of Sync indicator, health dashboard, CSS framework selector, click-to-select navigation, results filtering
**Avoids:** setPluginData 100kB limit (Pitfall 2), missing chunk cleanup (Pitfall 5 from Architecture)

### Phase 4: MCP Server Core
**Rationale:** The MCP server consumes data the plugin produces. By this phase, real injected files exist to develop and test against. Build the Figma API client (with rate limiting and caching), chunk reconstruction, and the three tool handlers.
**Delivers:** Working MCP server with stdio transport; Figma REST API client with cache and rate limiting; chunk reconstruction; `get_design_tokens`, `get_component_specs`, `get_audit_summary` tools; multi-file support; four CSS framework formatters.
**Addresses:** All MCP server table stakes, multi-file support, in-memory cache, error handling
**Avoids:** Rate limit exhaustion (Pitfall 3), stdio corruption (Pitfall 4), 403 confusion (Pitfall 5), fetching on every tool call (Architecture anti-pattern 3)

### Phase 5: Integration, Testing, and Polish
**Rationale:** End-to-end validation across the full pipeline (plugin audit -> inject -> REST API -> MCP tool response). Test with real Figma files of varying complexity. Polish UI for Figma Community submission standards.
**Delivers:** End-to-end tested pipeline; error boundaries in React UI; bundle size verification; documentation (README with setup guide); Figma Community manifest preparation.
**Addresses:** Export/copy results, clear documentation, error states and loading indicators
**Avoids:** "Looks done but isn't" items from Pitfalls research

### Phase Ordering Rationale

- **Shared types first** because they are the contract between plugin and MCP server. Changing them later means changing both consumers.
- **Plugin before MCP server** because the MCP server consumes data the plugin produces. Real audit data is essential for meaningful MCP development and testing.
- **Audit engine before UI** because the UI displays audit results. Building UI first would require fake data and risk mismatches.
- **Integration last** because it validates assumptions made in earlier phases and catches cross-boundary bugs that unit tests miss.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Vite dual-build configuration for Figma plugins needs live verification. The `vite-plugin-singlefile` version and config syntax should be confirmed. MCP SDK API shape may have changed since training data.
- **Phase 2:** Figma plugin API capabilities for variable detection and `documentchange` event specifics need verification against current API docs. Variable resolution (distinguishing bound variables from raw values) is the least-documented aspect.
- **Phase 4:** MCP SDK tool registration API and transport setup need verification against current SDK. The `@modelcontextprotocol/sdk` package was evolving rapidly. Test against both Cursor and Trae early.

Phases with standard patterns (skip research-phase):
- **Phase 3:** Chunking, `setPluginData`, React UI components are all well-documented patterns. No novel research needed.
- **Phase 5:** Integration testing and documentation are standard engineering work.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | All versions from training data (May 2025). Core choices (Vite, React, MCP SDK, npm workspaces) are sound but versions need verification. React 19 and Vite 7 may be current. |
| Features | MEDIUM | Feature landscape is well-researched from domain knowledge. Competitor analysis based on training data -- feature sets may have evolved. The core value proposition (audit + MCP bridge) is validated as novel. |
| Architecture | MEDIUM-HIGH | Figma plugin sandbox model and MCP stdio transport are well-established patterns. Data flow design is solid. Chunking strategy is sound. Monorepo structure is conventional. |
| Pitfalls | MEDIUM | Pitfalls are drawn from real Figma plugin and MCP server development patterns. Specific limits (100kB, 30 req/min) need verification. The pitfall-to-phase mapping is actionable. |

**Overall confidence:** MEDIUM

The architectural decisions and patterns are sound. The primary uncertainty is in exact library versions and API surfaces that may have evolved in the ~10 months since training data cutoff. This is a verification problem, not a design problem.

### Gaps to Address

- **MCP SDK API verification:** The tool registration pattern (`server.tool()`) and transport setup may have changed. Must read current SDK README before Phase 4 implementation.
- **Figma Variables REST API on free tier:** The project assumes `pluginData` is accessible via REST API on free tier. This must be confirmed -- Figma has been moving some API features to paid tiers.
- **React version decision:** React 18 vs 19. If React 19 is stable, it should be preferred. Verify before Phase 1.
- **Vite version decision:** Vite 6 vs 7. Check current stable before Phase 1.
- **Figma `documentchange` event specifics:** What properties are available in the change event? Can we filter to audit-relevant changes without scanning? Verify in Phase 2.
- **Figma Community submission requirements:** Current review guidelines, manifest requirements, and review timeline should be checked before Phase 5.
- **pluginData access via REST API:** Confirm that `getPluginData` on the document root node is returned in the `GET /v1/files/:key` response. If not, an alternative data storage strategy is needed (this would be a significant architectural change).

## Sources

### Primary (HIGH confidence)
- TypeScript compiler options and project references -- stable, well-documented
- npm workspaces -- stable, well-known feature
- Figma plugin dual-context model (sandbox + iframe) -- well-established, unlikely to change

### Secondary (MEDIUM confidence)
- Figma Plugin API (setPluginData, documentchange, scene graph) -- from training data, patterns well-established
- Figma REST API (file endpoint, pluginData access) -- from training data, endpoint stable
- MCP Protocol specification (stdio transport, JSON-RPC, tool schema) -- from training data, protocol standardized
- Vite build configuration patterns -- from training data, core API stable
- Competitor feature analysis (Design Lint, Tokens Studio, Figma Enterprise) -- from training data, may have evolved

### Tertiary (LOW confidence)
- All specific package version numbers -- from training data (May 2025 cutoff), must verify
- MCP SDK `@modelcontextprotocol/sdk` API surface -- was evolving rapidly, verify before use
- Figma API rate limits (30 req/min) -- approximate, not publicly documented with precision
- `@create-figma-plugin/utilities` maintenance status -- verify before adopting

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
