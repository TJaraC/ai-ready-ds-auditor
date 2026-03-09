# ARCH-03: MCP Adaptation Layer + Streaming Decision

**Status:** Decided
**Date:** 2026-03-09
**Requirement:** ARCH-03

---

## Context

### Current MCP Server Structure

```
packages/mcp-server/src/
  server.ts           (24 LOC)  — McpServer setup + tool registration
  index.ts            (minimal) — stdio transport entry point
  cache/store.ts      (96 LOC)  — DesignSystemCache (Figma API + chunk reconstruction)
  figma/client.ts     (~80 LOC) — fetchFigmaFile() with retry logic
  figma/chunk-reader.ts (~80 LOC) — reconstructReport() from plugin data
  figma/types.ts      (error types)
  tools/get-audit-summary.ts    (99 LOC)
  tools/get-component-specs.ts  (94 LOC)
  tools/get-design-tokens.ts    (86 LOC)
  formatters/          (4 CSS framework formatters)
```

### Current coupling problems

1. **MCP tools directly consume `AuditReport`** — the raw shared type. Adding new properties to `AuditReport` propagates into tool output shapes automatically (sometimes desired, often not)
2. **No adaptation layer** — tools format the response inline with zod/SDK calls interleaved with data transformation
3. **`get_audit_summary` returns full `AuditIssue[]` as JSON** — for large design systems this can be 100kB+ of JSON in a single tool response, causing IDE timeouts or truncation

### Streaming requirements (from v2.0 scope)

`get_audit_summary` must support:
- Event sequence: `start → progress (N) → chunk (M) → end` or `error`
- Each `chunk` event must be independently parseable
- Non-stream fallback when client doesn't send `progressToken`

---

## Streaming Decision: SSE vs NDJSON (MCP SDK Progress Notifications)

### Option A — HTTP + SSE
- Requires switching to HTTP transport (currently stdio)
- SSE is the MCP SDK's HTTP transport mechanism
- Each SSE `data:` line is a JSON-RPC message
- **Requires** running an HTTP server locally (port binding, CORS issues)

### Option B — MCP SDK stdio progress notifications (NDJSON)
- Uses `RequestHandlerExtra.sendNotification()` (or equivalent in SDK v1.27.x)
- Client includes `_meta.progressToken` in the tool call request
- Server sends `notifications/progress` JSON-RPC messages during processing
- Each notification is a line of NDJSON over the stdio pipe
- Final `CallToolResult` returned at the end
- Non-stream fallback: if no `progressToken` in `_meta`, skip notifications and return `CallToolResult` directly

### Decision: **Option B — MCP SDK progress notifications over stdio**

Rationale:
- The plugin MCP server already uses stdio transport (`StdioServerTransport`)
- SSE requires HTTP — adding an HTTP server breaks the zero-infrastructure design goal
- Progress notifications are part of the MCP spec — supported by Cursor, Trae, and other MCP clients
- The SDK v1.27.x provides the notification infrastructure via `server.sendProgress()` (or the server notification API)
- NDJSON framing is handled by the SDK — no custom serialization needed

### Event Schema for `get_audit_summary` streaming

```typescript
// Sent via notifications/progress during tool execution
type AuditStreamEvent =
  | { type: 'start'; fileKey: string; fileName: string; totalIssues: number }
  | { type: 'progress'; step: string; percent: number }
  | { type: 'chunk'; category: string; issues: AuditIssue[]; chunkIndex: number; totalChunks: number }
  | { type: 'end'; summary: AuditSummaryResult }
  | { type: 'error'; message: string; code: string };
```

Each `chunk` event:
- Contains all issues for one `category` (color | typography | spacing | border | effects | component)
- `chunkIndex` and `totalChunks` allow clients to track progress and reconstruct order
- Independently parseable — no dependency on other chunks
- If `category` filter is applied, only the matching category is chunked (one chunk + end)

### Non-stream fallback

If `request._meta?.progressToken` is absent:
- Skip all notifications
- Return `CallToolResult` with full `JSON.stringify(result)` as text content
- This mirrors v1.0 behavior exactly

---

## Adaptation Layer Decision

### Option A — No adaptation layer
Tools use `AuditReport` directly. Current state.

### Option B — Transform-on-read layer
Each tool has a dedicated `adapt_*(report, params): ToolOutput` pure function. The MCP tool handler calls this function and wraps the result in `CallToolResult`.

### Option C — Separate `adapter/` module
A standalone `packages/mcp-server/src/adapter/` directory with one file per tool output shape.

### Decision: **Option B — Transform-on-read functions**

Rationale:
- Option C creates directory overhead for what are pure transform functions
- Option B achieves the separation goal: MCP protocol concerns stay in `tools/`, data transformation stays in `adapt_*` functions co-located or in a light `adapter.ts` file
- The adapter functions are pure (AuditReport in, plain object out) → easily testable

### Implementation

New file: `packages/mcp-server/src/adapter.ts`

```typescript
export function adaptAuditSummary(report: AuditReport, category?: Category): AuditSummaryResult
export function adaptComponentSpec(component: ComponentSpec): ComponentSpecResult
export function adaptDesignTokens(tokens: DesignToken[], framework: string): FormattedTokens
```

Tool files (`tools/*.ts`) become thin wrappers:
1. Parse parameters (Zod)
2. Call `cache.ensureLoaded(fileKey)`
3. Call adapter function
4. Wrap in `CallToolResult`
5. Handle errors

---

## Consequences

- **Positive:** Tool changes don't require touching audit data structures
- **Positive:** Adapter functions are unit-testable without MCP SDK
- **Positive:** Streaming logic is encapsulated in the tool handler, not in business logic
- **Positive:** Non-stream fallback is the default — no breaking change for existing integrations
- **Negative:** Adapter layer is new surface area (~50 LOC)
- **Risk:** MCP SDK v1.27.x `sendProgress()` / notification API may have changed — must verify exact method signature before Phase 9 implementation

---

## Open Questions

1. **SDK notification API:** Confirm exact method name/signature in `@modelcontextprotocol/sdk@1.27.1` before implementing. Check `RequestHandlerExtra` type in `@modelcontextprotocol/sdk/server/mcp.js`.
2. **Chunk size:** Is one category per chunk the right granularity? For a design system with 10,000 color issues, one `color` chunk could still be 500kB. Consider sub-chunking by count (e.g., 200 issues/chunk) within a category. **Decision deferred to Phase 9** — Phase 9 planner must resolve this.
3. **`get_component_svg` streaming:** SVG data can be large for complex icons. Does it need streaming too? **Out of scope for Phase 9** — only `get_audit_summary` streams in v2.0.
