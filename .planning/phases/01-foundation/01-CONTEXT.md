# Phase 1: Foundation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the npm workspaces monorepo with three packages (shared, plugin, mcp-server), define all shared TypeScript types that form the data contract between plugin and MCP server, configure the Vite dual-build for the Figma plugin (code.js + single-file ui.html), establish the typed message protocol between plugin sandbox and UI iframe, and validate that all builds pass under strict TypeScript. No audit logic, no MCP tools — just the foundation every other phase builds on.

</domain>

<decisions>
## Implementation Decisions

### Workspace structure
- Root: npm workspaces monorepo (not pnpm, not Turborepo — keep it simple)
- Three packages: `packages/shared`, `packages/plugin`, `packages/mcp-server`
- Root-level `tsconfig.base.json` extended by each package
- TypeScript project references: both `plugin` and `mcp-server` reference `shared`
- Root-level scripts: `build`, `dev`, `lint`, `type-check`, `test` — all delegate to workspaces

### Shared types schema
- `AuditReport` is the top-level output of a scan — structured as:
  ```
  { schemaVersion, fileId, fileName, scannedAt, summary, issues, components, tokens }
  ```
- `issues` is a flat array of `AuditIssue` (not nested by category) — category is a field on each issue. Flat is easier to filter/sort in MCP tools.
- `AuditIssue` shape: `{ id, nodeId, nodeName, pageName, category, issueType, offendingValue, suggestedFix }`
- `DesignToken` shape: `{ id, name, type, value, rawValue, variableName?, collectionName?, groupPath[] }` — includes both resolved value AND original Figma variable name for traceability
- `ComponentSpec` shape: `{ id, name, key, description, variants[], props[], usageCount }`
- `AuditMeta` (stored in `ai_data_meta`): `{ schemaVersion, chunkCount, totalBytes, fileId, fileName, scannedAt, checksum }`
- `schemaVersion` is a string constant (e.g., `"1.0.0"`) exported from shared package
- Chunking constants exported from shared: `CHUNK_KEY_PREFIX = "ai_data_"`, `META_KEY = "ai_data_meta"`, `MAX_CHUNK_BYTES = 90_000`

### Message protocol
- Discriminated union pattern: all messages have a `type` field (string literal)
- **Fire-and-forget for most messages** — no correlation IDs needed at this stage
- Exception: scan progress uses a streaming pattern: UI sends `START_SCAN`, sandbox sends multiple `SCAN_PROGRESS` messages then a final `SCAN_COMPLETE` or `SCAN_ERROR`
- Message types to define in Phase 1 (even if not all used until later phases):
  - UI → Sandbox: `START_SCAN`, `INJECT_DATA`, `SELECT_NODE`
  - Sandbox → UI: `SCAN_PROGRESS`, `SCAN_COMPLETE`, `SCAN_ERROR`, `INJECT_COMPLETE`, `INJECT_ERROR`, `SYNC_OUTDATED`
- Types live in `packages/shared/src/messages.ts`

### TypeScript configuration
- `strict: true` — non-negotiable across all packages
- `noUncheckedIndexedAccess: true` — catch array/object access bugs
- `exactOptionalPropertyTypes: true` — no implicit undefined in optional fields
- `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
- `@figma/plugin-typings` applied only to `packages/plugin` sandbox code (not the UI)
- ESLint rule `no-console` set to `error` in `packages/mcp-server` (stdio transport safety)
- Prettier: single quotes, 2-space indent, trailing commas ES5, 100-char print width

### Vite dual-build
- Plugin package has two Vite configs or a single config with multiple entry points:
  - Entry 1: `src/sandbox/code.ts` → `dist/code.js` (IIFE or CJS, no DOM types)
  - Entry 2: `src/ui/index.tsx` → `dist/ui.html` (inlined via `vite-plugin-singlefile`)
- `dist/manifest.json` is the Figma plugin entry point (copied from source)
- `npm run dev` in plugin package: Vite watch mode for both entries simultaneously
- `npm run build` in plugin package: production builds of both entries

### Dev workflow
- Developer loads plugin in Figma via "Plugins → Development → Import plugin from manifest" pointing to `packages/plugin/dist/manifest.json`
- Vite watch mode rebuilds on save; developer manually refreshes plugin in Figma (no hot module replacement — Figma sandbox doesn't support it)
- UI hot reload IS possible within the iframe via Vite's HMR during development
- MCP server dev: `npm run dev` uses `tsx watch` for live reload during Node.js development

### Claude's Discretion
- Exact `manifest.json` permissions (editorType, network access) — Claude determines based on Figma plugin API requirements
- Specific ESLint rules beyond the no-console ban — Claude chooses a reasonable TypeScript-eslint ruleset
- Prettier config details — Claude uses the decisions above and fills in reasonable defaults
- `vitest` workspace config — Claude sets up test runner for all packages

</decisions>

<specifics>
## Specific Ideas

- The `schemaVersion` constant must be the first thing exported from `packages/shared` — it's the forward-compatibility anchor for the entire system
- Bundle size monitoring: `packages/plugin` UI build should output bundle size after each build so it's visible from day one (target: <200kB gzipped for final product)
- The monorepo should have a root `.gitignore` that covers all packages (node_modules, dist, .env files)
- Everything-claude-code architecture reviewer should validate the Phase 1 scaffold before moving to Phase 2

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the patterns all other phases follow

### Integration Points
- `packages/shared` is the contract hub: plugin sandbox imports types for AuditReport production; MCP server imports types for consumption and validation
- `packages/plugin/dist/manifest.json` is the Figma entry point — must exist before any Figma testing is possible
- `packages/mcp-server` will be invoked via stdio by Cursor/Trae — the package.json `bin` field and `main` entry must be correct from Phase 4 onward

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-02*
