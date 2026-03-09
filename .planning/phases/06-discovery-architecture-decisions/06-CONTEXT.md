# Phase 6: Discovery & Architecture Decisions - Context

**Gathered:** 2026-03-09
**Status:** Ready for execution

<domain>
## Phase Boundary

Produce decisions and documentation only — no code changes. Outputs are:
1. Codebase map (every module, responsibilities, coupling)
2. Figma frames catalogued (Audit-1, Audit-2, Config-1)
3. MCP streaming approach decided
4. ARCH-01–05 concrete decisions documented
5. Written output Phase 7 executes against without ambiguity

</domain>

<decisions>
## Implementation Decisions

### Figma Frame Access
- Use personal access token from environment config (FIGMA_TOKEN)
- File key: SXpZVjBDzXFvyl29IYrs1q
- Frames to catalogue: Audit-1, Audit-2, Config-1
- Access via Figma REST API: GET /v1/files/{key}
- Extract: components, text styles, color variables, spacing tokens, component states

### MCP Streaming Approach
- Decide between SSE (HTTP transport) and NDJSON (stdio progress notifications)
- Required event types: start / progress / chunk / end / error
- Each chunk must be independently parseable (no dependency on adjacent chunks)
- Non-stream fallback is mandatory for clients that don't support streaming
- Decision documented in ARCH-03 with tradeoffs

### Architecture Decision Format
- One markdown file per decision: ARCH-01.md through ARCH-05.md
- Location: .planning/decisions/
- Structure per file: Context, Options, Decision, Consequences, Open Questions

### Discovery Output Structure
- .planning/decisions/ARCH-01.md through ARCH-05.md
- .planning/phases/06-discovery-architecture-decisions/UI-SPEC.md
- .planning/phases/06-discovery-architecture-decisions/ASSUMPTIONS.md
- .planning/phases/06-discovery-architecture-decisions/PHASE-7-BRIEF.md
- Write for downstream agents — structure over prose

### Claude's Discretion
- Which specific Figma API endpoints to use for component/token extraction
- Internal organization within each ARCH-xx doc
- Level of detail in codebase map (judgment call per module)

</decisions>

<specifics>
## Specific Ideas

- REQUIREMENTS.md and ROADMAP.md already exist and are current — do not rewrite, reference them
- PHASE-7-BRIEF.md must be actionable enough that Phase 7 can execute without asking the user
- Streaming decision must be made with the concrete MCP SDK version in mind (check package.json)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- packages/shared/src/types.ts: All shared types — any architectural split must maintain these contracts
- packages/plugin/src/sandbox/inject.ts: Injection logic (60 LOC) — candidate for ARCH-02 separation
- packages/mcp-server/src/figma/chunk-reader.ts: Chunk reconstruction — candidate for ARCH-04 separation

### Established Patterns
- Message passing: UIMessage / SandboxMessage types in shared/messages.ts
- Chunked storage: ai_data_1, ai_data_2... with ai_data_meta as index
- CJS for MCP server (ESM resolution issues with shared package)

### Integration Points
- Plugin → shared: @shared/* path alias in vite.config.sandbox.ts
- MCP server → shared: CJS require via dist/
- Plugin UI ↔ Sandbox: postMessage with typed UIMessage / SandboxMessage

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-discovery-architecture-decisions*
*Context gathered: 2026-03-09*
