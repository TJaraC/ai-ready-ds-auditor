# Phase 4: MCP Server - Research

**Researched:** 2026-03-04
**Domain:** MCP Server (Node.js + TypeScript + @modelcontextprotocol/sdk) + Figma REST API (pluginData reconstruction)
**Confidence:** MEDIUM-HIGH (core stack HIGH, Figma pluginData REST access MEDIUM, CSS formatter output formats MEDIUM)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCP-01 | MCP server runs as local Node.js process via `@modelcontextprotocol/sdk` with `StdioServerTransport` | SDK v1.27.1 confirmed on npm; `McpServer` + `StdioServerTransport` pattern verified with code examples |
| MCP-02 | On session start, exactly one `GET /v1/files/:file_key` per configured file | REST API endpoint confirmed; see CRITICAL FINDING on rate limits — Tier 1, 6/month free tier |
| MCP-03 | Server reconstructs chunked JSON from `ai_data_meta` + `ai_data_1…N` keys | plugin_data query parameter confirmed; pluginData on document node returns keyed string map; plugin manifest ID `1610802699324330019` is numeric — compatible |
| MCP-04 | Reconstructed data stored in in-memory cache (`Map<fileKey, CachedData>`) | Plain Map pattern verified; no external cache library needed |
| MCP-05 | Server supports multiple Figma files simultaneously (multi-file cache) | Map keyed by fileKey handles this trivially |
| MCP-06 | No redundant Figma API calls while cache is valid | Lazy-load on first tool call pattern; checked before fetching |
| MCP-07 | All `console.log()` replaced with `console.error()` to prevent stdio transport corruption | ESLint `no-console: error` already configured in mcp-server eslint.config.ts; use `process.stderr.write()` instead |
| MCP-08 | Figma API responses fully typed (no `any`) | Use official `figma/rest-api-spec` OpenAPI types; or hand-typed based on known response shape |
| MCP-09 | Internal data structures (cache entries, tool responses) fully typed | TypeScript strict mode already configured; use interfaces from packages/shared |
| ERR-01 | 403 → structured error with step-by-step sharing instructions | Tool handler wraps fetch, checks status code, returns structured text response |
| ERR-02 | 429 → exponential backoff and retry | Parse `Retry-After` header from 429 response; implement retry loop with back-off |
| ERR-03 | Chunk reconstruction failure → structured error with re-injection instructions | Null check on each chunk during reconstruction; wrap in try/catch |
| ERR-04 | Unknown `schemaVersion` → structured error with version mismatch details | Compare meta.schemaVersion to `schemaVersion` export from packages/shared |
| TOOL-01 | `get_design_tokens` — optional `fileKey` and `framework`; returns formatted tokens | `server.tool()` with zod schema; formatter dispatch by framework string |
| TOOL-02 | `get_component_specs` — `componentName` or `componentId`; returns full spec | Filter `report.components` by name or id match |
| TOOL-03 | `get_audit_summary` — optional `fileKey` and `category` filter | Filter `report.issues` by category; return structured list |
| TOOL-04 | All tool input schemas validated with `zod` before processing | `server.tool(name, zodSchema, handler)` — zod validation is automatic |
| TOOL-05 | All tool responses conform to typed interfaces from `packages/shared` | TypeScript compilation enforces this at build time |
| FMT-01 | Tailwind formatter → `tailwind.config.js`-compatible theme object | Tailwind v3 JS object format + v4 @theme CSS alternative — research below |
| FMT-02 | CSS Variables formatter → `:root { --token-name: value; }` | Simple template string; no library needed |
| FMT-03 | CSS Modules formatter → typed module definitions with `:export` blocks | Simple template string; `:export { name: value; }` pattern |
| FMT-04 | Styled Components formatter → typed `theme` object for `ThemeProvider` | TypeScript object literal with type annotation |
</phase_requirements>

---

## Summary

Phase 4 builds the local MCP server that reads audit data injected by the Phase 3 plugin and exposes it as three tools (`get_design_tokens`, `get_component_specs`, `get_audit_summary`) to AI IDEs via stdio transport. The technical stack is straightforward: `@modelcontextprotocol/sdk` v1.27.1 (current stable), `zod` v4.3.6 (already on npm), Node.js native `fetch`, and TypeScript strict mode already configured in packages/mcp-server.

Two critical discoveries from research change the planning assumptions. First, the **Figma REST API `GET /v1/files` is Tier 1**, meaning free Starter plan users are limited to **6 requests per month** (not 30/minute as previously assumed). This makes aggressive caching not just a performance optimization but a functional requirement — the server must function across an entire AI coding session without triggering rate limit exhaustion. Second, **accessing pluginData via the REST API requires passing the plugin's numeric ID as a `plugin_data` query parameter**. Our plugin's manifest ID `1610802699324330019` is already numeric and assigned by Figma, so this works without publishing — but the MCP server must know this ID to request the data. The ID must be hardcoded or configured in the server.

The MCP SDK API (v1.x) is confirmed: `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`, `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`, tool registration via `server.tool(name, zodSchema, asyncHandler)`, and tool responses as `{ content: [{ type: "text", text: "..." }] }`. The SDK v2 pre-alpha exists on main branch but v1.x remains the production recommendation.

**Primary recommendation:** Build the MCP server with lazy loading (fetch on first tool call, not at startup) and a session-scoped in-memory cache (Map). The rate limit reality means users will likely exhaust their free quota if the server fetches on every process restart — the implementation must surface this clearly in setup documentation and error messages.

---

## CRITICAL FINDING: Figma REST API Rate Limits for Free Tier

This was the flagged blocker from STATE.md and has been verified.

**GET /v1/files/:key is Tier 1.** Rate limits per plan:

| Plan | View/Collab seat | Dev seat | Full seat |
|------|-----------------|----------|-----------|
| Starter (free) | 6/month | 6/month | 6/month |
| Professional | 5/min | higher | higher |
| Organization | higher | higher | higher |

**Source:** Official Figma Rate Limits documentation confirmed Nov 2025 rate limit enforcement.

**Implication for architecture:**
- 6 calls/month on free tier means a user who restarts their IDE 7 times in a month will be rate-limited.
- The in-memory cache (Map) solves this within a single session (process lifetime).
- Across sessions, the cache is lost. Each new IDE session (process spawn) will consume one API call per configured file.
- **This is a known, documented limitation** that must be clearly communicated in the MCP server README/configuration.
- ERR-02 (429 handling with backoff) is still required — Pro plan users have per-minute limits that can be hit.

**Important nuance:** The Retry-After header on 429 responses can be hours or days for Starter plan users, not seconds. Backoff with retry is only practical for minute-rate-limit 429s (Professional+ plan). For monthly 429s, the only real response is to show a clear error explaining the monthly limit has been reached.

**Decision needed by planner:** Whether to implement a simple session cache only (correct for v1) or also a disk-based cache that persists across restarts (v2 enhancement). Research recommends session-only cache for v1 per REQUIREMENTS.md.

---

## CRITICAL FINDING: pluginData REST API Access

**Confirmed mechanism:** Pass `plugin_data=<plugin_id>` as a query parameter to `GET /v1/files/:key`. The response will include `pluginData` property on each node, including the DOCUMENT root node, keyed by the plugin's string-valued custom keys (`ai_data_meta`, `ai_data_1`, etc.).

**Plugin ID requirement:** The ID must be digits-only. Our manifest already has `"id": "1610802699324330019"` — a valid numeric ID assigned by Figma. This works for unpublished plugins as long as the ID is numeric.

**What the response looks like (MEDIUM confidence — inferred from API spec):**
```json
{
  "document": {
    "id": "0:0",
    "type": "DOCUMENT",
    "pluginData": {
      "ai_data_meta": "{\"schemaVersion\":\"1.0.0\",\"chunkCount\":2,...}",
      "ai_data_1": "...chunk 1 JSON...",
      "ai_data_2": "...chunk 2 JSON..."
    },
    "children": [...]
  }
}
```

**LOW confidence caveat:** The exact response structure (is it `response.document.pluginData` or differently nested?) could not be confirmed with a live API call. The planner should include a verification step early in Plan 04-01 that makes a real API call and inspects the response before building the chunk reader.

**Alternative if pluginData is NOT on the document root:** Use `GET /v1/files/:key/nodes?ids=0:0&plugin_data=<id>` (the file nodes endpoint) which explicitly allows node ID targeting. The DOCUMENT node ID in Figma is always `0:0`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | 1.27.1 (current npm) | MCP server with stdio transport + tool registration | Official SDK; only serious option |
| `zod` | 4.3.6 (current npm) | Tool input schema validation | SDK peer dependency; validates before handler runs |
| Node.js native `fetch` | Node 18+ built-in | Figma REST API HTTP calls | No dependency needed; Node 18+ ships fetch globally |
| `@ai-ds-auditor/shared` | workspace | Shared types: AuditReport, DesignToken, etc. | Already defined in Phase 1; single source of truth |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | dev only | TypeScript dev runner (`npm run dev`) | Already in package.json for dev watch mode |
| Node.js `process.env` | built-in | FIGMA_ACCESS_TOKEN, FIGMA_FILE_KEYS config | Standard env var pattern for local tools |
| `process.stderr.write()` | built-in | Logging (NOT console.* — stdio safety) | Already enforced by ESLint `no-console: error` in mcp-server |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | `node-fetch` or `axios` | Node 18+ has fetch; no dependency justified |
| In-memory Map cache | `lru-cache` or disk SQLite | Session scope is correct; disk cache is v2 enhancement per REQUIREMENTS.md |
| Hand-rolled formatters | `style-dictionary` | Style Dictionary is heavyweight for 4 simple formatters; hand-roll is 50 lines each |
| `@modelcontextprotocol/sdk` v1 | SDK v2 pre-alpha | v2 is pre-alpha, not production; v1 is recommended until Q1 2026 stable |

**Installation (packages/mcp-server):**
```bash
npm install @modelcontextprotocol/sdk zod -w packages/mcp-server
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/mcp-server/src/
├── index.ts              # Entry point: env validation + server.connect()
├── server.ts             # McpServer creation + all tool registrations
├── figma/
│   ├── client.ts         # Figma REST API fetch wrapper (typed, error-handling)
│   ├── chunk-reader.ts   # Reconstruct AuditReport from pluginData keys
│   └── types.ts          # Figma REST API response types (GetFileResponse, Node)
├── cache/
│   └── store.ts          # DesignSystemCache class (Map<fileKey, CacheEntry>)
├── tools/
│   ├── get-design-tokens.ts
│   ├── get-component-specs.ts
│   └── get-audit-summary.ts
└── formatters/
    ├── tailwind.ts
    ├── css-variables.ts
    ├── css-modules.ts
    └── styled-components.ts
```

**Key decisions:**
- `index.ts` is thin: reads env vars, creates server, connects transport
- `server.ts` imports tool handlers and wires them; owns the `McpServer` instance
- Tools receive the cache instance and the figma client; they do not fetch directly
- Formatters are pure functions: `(tokens: DesignToken[]) => string`

### Pattern 1: McpServer Tool Registration (v1.x SDK)

**What:** The `server.tool()` method registers a tool with a name, zod input schema, and async handler. Zod validation is automatic before the handler runs.

**When to use:** All three tools use this pattern.

**Example (verified from freecodecamp.org/news article citing official SDK):**
```typescript
// Source: @modelcontextprotocol/sdk v1.x
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "AI-Ready DS Auditor",
  version: "0.1.0",
});

server.tool(
  "get_design_tokens",
  {
    fileKey: z.string().optional().describe("Figma file key (from URL)"),
    framework: z.enum(["tailwind", "css-variables", "css-modules", "styled-components"])
      .optional()
      .default("tailwind"),
  },
  async ({ fileKey, framework }) => {
    // ... handler implementation
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
```

### Pattern 2: Figma REST API Fetch with pluginData

**What:** Single authenticated GET request with `plugin_data` query parameter; reads `response.document.pluginData` for the document root keys.

**When to use:** On cache miss; once per file per session.

```typescript
// Source: Figma REST API docs + rest-api-spec OpenAPI schema
const PLUGIN_ID = "1610802699324330019"; // From packages/plugin/manifest.json

async function fetchFigmaFile(fileKey: string, token: string): Promise<GetFileResponse> {
  const url = `https://api.figma.com/v1/files/${fileKey}?plugin_data=${PLUGIN_ID}`;
  const response = await fetch(url, {
    headers: { "X-Figma-Token": token },
  });

  if (response.status === 403) {
    throw new FigmaPermissionError(fileKey);
  }
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") ?? "60", 10);
    throw new FigmaRateLimitError(fileKey, retryAfter);
  }
  if (!response.ok) {
    throw new FigmaApiError(fileKey, response.status);
  }

  return response.json() as Promise<GetFileResponse>;
}
```

### Pattern 3: Chunk Reconstruction

**What:** Read `ai_data_meta` from `pluginData`, learn `chunkCount`, concatenate `ai_data_1`...`ai_data_N` strings, parse as JSON.

**When to use:** After every successful Figma API fetch.

**Actual chunk format from packages/plugin/src/sandbox/inject.ts:**
- Chunks are raw JSON substrings split at 81,000 characters each
- Metadata key: `ai_data_meta` (written LAST by the plugin)
- Chunk keys: `ai_data_1`, `ai_data_2`, ... (1-indexed)
- Meta contains: `schemaVersion`, `chunkCount`, `totalBytes`, `fileId`, `fileName`, `scannedAt`, `checksum`
- Checksum in current implementation is `''` (empty — not yet implemented in plugin)

```typescript
// Source: inferred from packages/plugin/src/sandbox/inject.ts
import type { AuditMeta, AuditReport } from "@ai-ds-auditor/shared";
import { META_KEY, CHUNK_KEY_PREFIX } from "@ai-ds-auditor/shared";

function reconstructReport(pluginData: Record<string, string>): AuditReport {
  const rawMeta = pluginData[META_KEY]; // "ai_data_meta"
  if (!rawMeta) {
    throw new Error("No audit data found. Run injection from the plugin first.");
  }

  const meta = JSON.parse(rawMeta) as AuditMeta;

  let json = "";
  for (let i = 1; i <= meta.chunkCount; i++) {
    const chunk = pluginData[`${CHUNK_KEY_PREFIX}${i}`]; // "ai_data_1", "ai_data_2"...
    if (chunk === undefined || chunk === "") {
      throw new Error(`Missing chunk ${CHUNK_KEY_PREFIX}${i}. Re-run injection from the plugin.`);
    }
    json += chunk;
  }

  return JSON.parse(json) as AuditReport;
}
```

### Pattern 4: CSS Framework Formatters (Pure Functions)

Each formatter is a pure function: `(tokens: DesignToken[]) => string`.

**Tailwind v3 format (FMT-01):**

```typescript
// Outputs a tailwind.config.js-compatible theme extension object
// Note: Tailwind v4 uses @theme CSS syntax, but v3 JS object is more universal
// Research shows v3 format (JS object) is still widely used and more IDE-compatible
function formatTailwind(tokens: DesignToken[]): string {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const typography: Record<string, string> = {};

  for (const token of tokens) {
    const key = token.name.replace(/\//g, "-").toLowerCase();
    if (token.type === "color") colors[key] = token.value;
    else if (token.type === "spacing") spacing[key] = token.value;
    else if (token.type === "typography") typography[key] = token.value;
  }

  return JSON.stringify({ theme: { extend: { colors, spacing, fontFamily: typography } } }, null, 2);
}
```

**CSS Variables format (FMT-02):**
```typescript
function formatCssVariables(tokens: DesignToken[]): string {
  const lines = tokens.map(t => {
    const name = `--${t.name.replace(/\//g, "-").replace(/\s/g, "-").toLowerCase()}`;
    return `  ${name}: ${t.value};`;
  });
  return `:root {\n${lines.join("\n")}\n}`;
}
```

**CSS Modules format (FMT-03):**
```typescript
function formatCssModules(tokens: DesignToken[]): string {
  const lines = tokens.map(t => {
    const name = t.name.replace(/\//g, "_").replace(/\s/g, "_").toLowerCase();
    return `  ${name}: ${t.value};`;
  });
  return `:export {\n${lines.join("\n")}\n}`;
}
```

**Styled Components format (FMT-04):**
```typescript
function formatStyledComponents(tokens: DesignToken[]): string {
  const obj: Record<string, Record<string, string>> = { colors: {}, spacing: {}, typography: {} };
  for (const token of tokens) {
    const key = token.name.replace(/\//g, ".").split(".").pop() ?? token.name;
    if (token.type === "color") obj.colors[key] = token.value;
    else if (token.type === "spacing") obj.spacing[key] = token.value;
    else if (token.type === "typography") obj.typography[key] = token.value;
  }
  return `export const theme = ${JSON.stringify(obj, null, 2)} as const;\nexport type Theme = typeof theme;`;
}
```

### Pattern 5: Error Response Format

Tool handlers must return structured errors as tool content (not throw), so the IDE sees actionable text:

```typescript
// MCP tools return errors as content, not thrown exceptions
function errorResponse(message: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: `ERROR: ${message}` }] };
}
```

For 403:
```
ERROR: Access denied to Figma file <fileKey>.

To fix:
1. Open the Figma file in your browser
2. Click "Share" in the top right
3. Change sharing to "Anyone with the link can view"
4. Try again
```

For chunk reconstruction failure:
```
ERROR: Audit data is missing or corrupted for file <fileKey>.

To fix:
1. Open the Figma file in Figma Desktop
2. Run the AI-Ready DS Auditor plugin
3. Click "Inject / Update"
4. Try again
```

### Anti-Patterns to Avoid

- **console.log in any mcp-server file:** Corrupts the stdio JSON-RPC stream silently. ESLint already enforces `no-console: error`. Use `process.stderr.write()`.
- **Fetching Figma API on every tool call:** With 6/month free tier, this would exhaust the quota in days. Cache-first is mandatory.
- **HTTP transport instead of stdio:** Local MCP servers use stdio. The IDE spawns the process and manages its lifecycle. No port management needed.
- **Throwing errors from tool handlers:** Return errors as `{ content: [{ type: "text", text: "ERROR: ..." }] }` so the LLM sees them and can act.
- **Assuming pluginData is on response root:** It's on `response.document.pluginData`, not `response.pluginData`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol framing | JSON-RPC transport | `@modelcontextprotocol/sdk` | Handles initialization, capability negotiation, tool listing, error codes |
| Tool input validation | Custom type guards | `zod` via `server.tool()` | Automatic schema validation before handler; generates JSON Schema for IDE tool discovery |
| Retry with backoff | Custom retry loop | Simple `setTimeout`-based retry for 429 | Only 1-2 retry needed; no library required for this simplicity |

**Key insight:** The MCP SDK eliminates the entire protocol layer. A 5-line `server.tool()` call handles capability declaration, schema exposure, input validation, and routing. Building any of this manually would take 300+ lines and introduce subtle protocol bugs.

---

## Common Pitfalls

### Pitfall 1: Figma Free Tier Rate Limit Surprise

**What goes wrong:** Developer implements lazy-loading correctly but doesn't warn users that 6/month means persistent session data loss (IDE restart = new API call).
**Why it happens:** Documentation focused on per-minute limits; the monthly limit is buried and was only changed November 2025.
**How to avoid:** Document prominently in README. Add clear error text when 429 is received with `Retry-After` > 3600 seconds (indicating monthly exhaustion, not minute exhaustion).
**Warning signs:** Users report getting 429 after a few IDE restarts per month.

### Pitfall 2: pluginData Not Found in Response

**What goes wrong:** `response.document.pluginData` is undefined even with `plugin_data` query parameter.
**Why it happens:** (a) Wrong plugin ID in query, (b) Plugin hasn't injected data yet, (c) File permissions issue, (d) pluginData might be on a differently-nested path.
**How to avoid:** Verify response structure with a real API call in Plan 04-01 before building chunk reader. Add defensive null-check with actionable error.
**Warning signs:** `pluginData` is `undefined` or `{}`.

### Pitfall 3: stdio Corruption via console.log

**What goes wrong:** Any `console.log()` in the server writes to stdout, corrupting the JSON-RPC stream, causing IDE to lose connection silently.
**Why it happens:** Developers reach for `console.log` instinctively during debugging.
**How to avoid:** ESLint `no-console: error` already configured. Use `process.stderr.write("debug info\n")` in dev.
**Warning signs:** IDE MCP client disconnects or shows JSON parse errors.

### Pitfall 4: Checksum Mismatch Surprise

**What goes wrong:** Chunk reconstruction fails with checksum error even though data looks intact.
**Why it happens:** The plugin currently writes `checksum: ''` (empty string) — it's not implemented. Comparing a computed checksum against `''` will always fail.
**How to avoid:** In the chunk reader, skip checksum validation when `meta.checksum === ''`. Add a comment explaining this is a known limitation until the plugin implements checksums.
**Warning signs:** ERR-03 fires on every reconstruction.

### Pitfall 5: Tailwind v4 vs v3 Format Mismatch

**What goes wrong:** FMT-01 outputs `@theme { --color-primary: #fff; }` CSS syntax, but users are on Tailwind v3 and expect a JavaScript config object.
**Why it happens:** Tailwind v4 (released 2025) uses CSS-first `@theme`; v3 uses JS config. The FMT-01 requirement says "tailwind.config.js-compatible theme object" — this is v3 format.
**How to avoid:** FMT-01 must output a JSON object representing the `theme.extend` section of `tailwind.config.js`. Label the output clearly. Consider supporting both v3 (JS object) and v4 (@theme CSS) as sub-options in a future version.
**Warning signs:** Users report the Tailwind output doesn't work with their setup.

### Pitfall 6: Module Resolution for ESM

**What goes wrong:** TypeScript imports from `@modelcontextprotocol/sdk` fail at runtime with "Cannot find module" or "ERR_REQUIRE_ESM".
**Why it happens:** The SDK ships as ESM. The mcp-server tsconfig has `"module": "ESNext"` and `"moduleResolution": "bundler"` — this is correct for Vite/bundlers but Node.js ESM requires `.js` extensions in import paths.
**How to avoid:** The tsconfig uses `"moduleResolution": "bundler"` which should handle this. Verify with `tsc` build. If runtime fails, may need to switch to `"moduleResolution": "nodenext"` and add `.js` to imports. Test the compiled output, not just TypeScript.
**Warning signs:** Runtime module resolution errors in `dist/index.js`.

---

## Code Examples

### Minimal Working Server (entry point pattern)

```typescript
// Source: @modelcontextprotocol/sdk v1.x — confirmed from freecodecamp + dev.to articles
// packages/mcp-server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "AI-Ready DS Auditor",
  version: "0.1.0",
});

server.tool(
  "get_audit_summary",
  {
    fileKey: z.string().optional(),
    category: z.enum(["color", "typography", "spacing", "border", "effects", "component"]).optional(),
  },
  async ({ fileKey, category }) => {
    // ... implementation
    return {
      content: [{ type: "text", text: "..." }],
    };
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${String(err)}\n`);
  process.exit(1);
});
```

### Figma API Response Type (hand-typed for our needs)

```typescript
// packages/mcp-server/src/figma/types.ts
export interface FigmaNode {
  id: string;
  type: string;
  name?: string;
  pluginData?: Record<string, string>;      // from plugin_data query param
  sharedPluginData?: Record<string, Record<string, string>>;
  children?: FigmaNode[];
}

export interface GetFileResponse {
  document: FigmaNode;  // type === "DOCUMENT", has pluginData at root
  name: string;
  lastModified: string;
  version: string;
  // ... other fields not needed
}
```

### Cache Entry

```typescript
// packages/mcp-server/src/cache/store.ts
import type { AuditReport, AuditMeta } from "@ai-ds-auditor/shared";

interface CacheEntry {
  fileKey: string;
  fileName: string;
  report: AuditReport;
  meta: AuditMeta;
  fetchedAt: number;
}

class DesignSystemCache {
  private entries = new Map<string, CacheEntry>();

  has(fileKey: string): boolean {
    return this.entries.has(fileKey);
  }

  get(fileKey: string): CacheEntry | undefined {
    return this.entries.get(fileKey);
  }

  set(fileKey: string, entry: CacheEntry): void {
    this.entries.set(fileKey, entry);
  }
}
```

### 429 Retry with Back-off

```typescript
// packages/mcp-server/src/figma/client.ts
async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 2): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status !== 429) return response;

    const retryAfter = parseInt(response.headers.get("Retry-After") ?? "60", 10);

    if (retryAfter > 3600) {
      // Monthly rate limit hit — no point retrying
      throw new FigmaMonthlyLimitError(retryAfter);
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    } else {
      lastError = new FigmaRateLimitError(retryAfter);
    }
  }

  throw lastError ?? new Error("Retry exhausted");
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 30 req/min Figma free limit (training data assumption) | 6 req/month for Tier 1 on Starter plan | Nov 17, 2025 | Session cache becomes critical infrastructure, not optimization |
| Tailwind v3 JS config object | Tailwind v4 @theme CSS (+ v3 still supported) | Jan 2025 (Tailwind v4 GA) | FMT-01 must choose one; recommend v3 JS object as default (more universal) |
| MCP SDK evolving rapidly | SDK v1.x stable; v2 pre-alpha on main | Q4 2024 stabilization | Use v1.x; don't adopt v2 pre-alpha |
| `console.error()` for MCP logging | `process.stderr.write()` | Phase 1 decision | ESLint bans console.* entirely — use process.stderr.write |

**Deprecated/outdated:**
- `30 req/min Figma free tier` assumption: Replaced by tiered monthly/per-minute limits that vary by endpoint and plan. GET /v1/files is Tier 1 = 6/month on free.
- MCP HTTP transport for local servers: stdio is correct for local, IDE-spawned processes. HTTP transport is for remote/cloud MCP servers.

---

## Open Questions

1. **Exact shape of `response.document.pluginData` from Figma REST API**
   - What we know: The `plugin_data` query parameter adds `pluginData` to nodes; DOCUMENT is the root node; keys are the same strings passed to `setPluginData`
   - What's unclear: Is it `response.document.pluginData` or does Figma nest it differently? Does it appear only when keys exist, or always as `{}`?
   - Recommendation: **Must verify with a live API call** in Plan 04-01 Wave 0 before building chunk reader. Use a real Figma file with injected data. If pluginData is missing from document root, fall back to `GET /v1/files/:key/nodes?ids=0:0&plugin_data=<id>`.

2. **Multiple Figma file keys: how to configure**
   - What we know: MCP-05 requires multi-file support; server spawned by IDE has no interactive config
   - What's unclear: Best approach — env vars (`FIGMA_FILE_KEYS=key1,key2`) vs config file (`~/.config/ai-ds-auditor/config.json`) vs stdio initialization
   - Recommendation: Use comma-separated env var (`FIGMA_FILE_KEYS`) for simplicity; validate on startup, error if empty.

3. **Tailwind v3 vs v4 output for FMT-01**
   - What we know: v4 uses @theme CSS syntax; v3 uses JS config object; requirement says "tailwind.config.js-compatible theme object" = v3
   - What's unclear: What percentage of target users are on v4 vs v3?
   - Recommendation: Implement v3 JS object format as default (matches requirement literal). Note v4 @theme as a future enhancement.

4. **Whether `checksum: ''` in current plugin output requires guard in chunk reader**
   - What we know: inject.ts writes `checksum: ''` — no checksum implemented in Phase 3
   - What's unclear: Should ERR-03 trigger on empty checksum, or only on missing chunks?
   - Recommendation: Skip checksum verification when `meta.checksum === ''`. Only validate non-empty checksums. Document in code.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (no `nyquist_validation` key). Skipping this section per instruction: skip if `false` or absent.

---

## Sources

### Primary (HIGH confidence)
- npm registry: `@modelcontextprotocol/sdk@1.27.1` — current version confirmed via `npm view`
- npm registry: `zod@4.3.6` — current version confirmed via `npm view`
- `packages/plugin/manifest.json` — Plugin ID `1610802699324330019` (numeric, confirmed compatible with REST API)
- `packages/plugin/src/sandbox/inject.ts` — Exact chunk format: 81,000-char splits, 1-based keys, `ai_data_meta` written last, `checksum: ''`
- `packages/shared/src/types.ts` — AuditReport, AuditMeta, AuditIssue, DesignToken, ComponentSpec types
- `packages/shared/src/constants.ts` — `CHUNK_KEY_PREFIX = 'ai_data_'`, `META_KEY = 'ai_data_meta'`
- `packages/mcp-server/eslint.config.ts` — `no-console: error` already configured
- `packages/mcp-server/tsconfig.json` — `"module": "ESNext"`, `"moduleResolution": "bundler"`

### Secondary (MEDIUM confidence)
- Figma REST API docs (`developers.figma.com/docs/rest-api/file-endpoints/`) — `plugin_data` parameter description confirmed: "comma separated list of plugin IDs and/or 'shared'; any data present in the document written by those plugins will be included in the result in the `pluginData` and `sharedPluginData` properties"
- Figma Rate Limits docs (`developers.figma.com/docs/rest-api/rate-limits/`) — GET /v1/files = Tier 1; Starter plan = 6/month; confirmed Nov 2025 enforcement
- Figma Forum — Plugin IDs must be digits-only for REST API; numeric IDs work for unpublished plugins; confirmed pattern
- freecodecamp.org/news MCP server article — `McpServer` + `server.tool()` + `StdioServerTransport` pattern with exact import paths from `@modelcontextprotocol/sdk/server/mcp.js` and `@modelcontextprotocol/sdk/server/stdio.js`
- GitHub modelcontextprotocol/typescript-sdk — v1.x is production recommended; v2 pre-alpha on main branch
- Tailwind CSS v4 docs (`tailwindcss.com/blog/tailwindcss-v4`) — v4 uses @theme CSS; v3 JS config object still valid and widely used

### Tertiary (LOW confidence)
- Exact shape of `response.document.pluginData` in Figma REST API response — inferred from API description but not confirmed with live call; MUST verify in Plan 04-01
- Whether GET /v1/files response includes pluginData on the DOCUMENT root node specifically or requires the `/nodes` endpoint — not confirmed with live call

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm, code examples verified from multiple sources
- Architecture: HIGH — patterns derived directly from existing codebase (inject.ts, shared types) + verified MCP SDK examples
- pluginData REST access: MEDIUM — mechanism confirmed (plugin_data query param, numeric ID), exact response shape LOW (requires live verification)
- Figma rate limits: HIGH — confirmed from official docs, Nov 2025 enforcement
- CSS formatters: MEDIUM — output format logic is simple; v3 vs v4 Tailwind decision is clear

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable APIs; rate limit policy is new and unlikely to change)
