# Architecture Research

**Domain:** Figma Plugin + Local MCP Server (DesignOps tool)
**Researched:** 2026-03-02
**Confidence:** MEDIUM (based on training data -- WebSearch/WebFetch/Bash unavailable; official docs could not be fetched for verification)

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FIGMA DESKTOP APP                           │
│                                                                      │
│  ┌─────────────────────┐    postMessage     ┌──────────────────────┐ │
│  │   Plugin Sandbox     │ ◄──────────────► │   Plugin UI (iframe)   │ │
│  │   (code.ts)          │                   │   (React + Vite)       │ │
│  │                      │                   │                        │ │
│  │  - figma.* API       │                   │  - Tab: Audit & Inject │ │
│  │  - Scene traversal   │                   │  - Tab: AI Context     │ │
│  │  - setPluginData()   │                   │  - No figma.* access   │ │
│  │  - documentchange    │                   │  - DOM/Canvas/fetch    │ │
│  └──────────┬───────────┘                   └──────────────────────┘ │
│             │                                                        │
│             │ setPluginData() / getPluginData()                      │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │              Figma File (pluginData storage)                      │ │
│  │  Keys: ai_audit_meta, ai_data_1, ai_data_2, ... ai_data_N       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ Figma REST API (GET /v1/files/:key)
                              │ (reads pluginData from file)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       LOCAL MCP SERVER (Node.js)                     │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Figma API     │   │ Cache Layer  │   │ MCP Tool Handlers        │ │
│  │ Client        │──►│ (in-memory)  │──►│                          │ │
│  │               │   │              │   │ - get_component_specs    │ │
│  │ - fetch file  │   │ - per-file   │   │ - get_design_tokens      │ │
│  │ - reconstruct │   │ - TTL-based  │   │ - get_audit_summary      │ │
│  │   chunks      │   │ - multi-file │   │                          │ │
│  └──────────────┘   └──────────────┘   └──────────────────────────┘ │
│                                                                      │
│  Transport: stdio (spawned by IDE)                                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (JSON-RPC over stdio)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    IDE (Cursor / Trae / etc.)                         │
│                                                                      │
│  MCP Host → MCP Client → calls tools → receives structured JSON     │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Runtime |
|-----------|----------------|-------------------|---------|
| **Plugin Sandbox** (`code.ts`) | Scene traversal, audit logic, data injection via `setPluginData()`, change detection via `figma.on("documentchange")` | Plugin UI via `postMessage`; Figma file via pluginData API | Figma's V8 sandbox (no DOM, no network) |
| **Plugin UI** (React iframe) | User interface: tabs, health dashboard, framework selector, manual triggers | Plugin Sandbox via `postMessage` only | iframe with DOM, but no `figma.*` API access |
| **Figma File Storage** | Persists chunked audit JSON as pluginData on the document root node | Written by Plugin Sandbox; read by MCP Server via REST API | Figma cloud storage |
| **MCP Server** | Fetches file data from Figma REST API, reconstructs chunks, caches, exposes MCP tools | Figma REST API (HTTP); IDE via MCP protocol (stdio) | Node.js local process |
| **Shared Types** | TypeScript interfaces for audit data schema, ensuring Plugin and MCP Server agree on data shape | Imported by Plugin Sandbox and MCP Server at build time | Compile-time only |

### Figma Plugin Sandbox Model (MEDIUM confidence)

The Figma plugin architecture enforces a strict separation between two execution contexts:

1. **Main thread (code.ts):** Runs in a sandboxed V8 environment with access to the `figma.*` API (scene graph, pluginData, events). Has NO access to DOM, browser APIs, or network. This is where all Figma interaction happens.

2. **UI thread (iframe):** An HTML page rendered in an iframe. Has access to DOM, Canvas, `fetch`, and browser APIs. Has NO access to `figma.*`. This is where React renders the plugin UI.

Communication between them is exclusively via `figma.ui.postMessage()` (sandbox to UI) and `parent.postMessage()` (UI to sandbox). Messages must be serializable (no functions, no circular refs).

**Key implication:** All audit logic (scene traversal, style inspection, variable detection) MUST live in code.ts. The UI can only display results and trigger actions via messages.

### MCP Protocol Model (MEDIUM confidence)

The Model Context Protocol uses a client-server architecture:

- **Host:** The IDE (Cursor, Trae) that manages MCP client lifecycle
- **Client:** Embedded in the host, maintains 1:1 connection with a server
- **Server:** Our local Node.js process, exposes tools/resources/prompts

For local servers, the standard transport is **stdio** (stdin/stdout JSON-RPC). The IDE spawns the MCP server as a child process and communicates over pipes. This means:

- No HTTP server needed
- No port management
- Server lifecycle is managed by the IDE
- stderr can be used for logging (stdout is reserved for protocol)

## Recommended Monorepo Structure

```
ai-ready-ds-auditor/
├── packages/
│   ├── shared/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── audit.ts       # AuditReport, AuditIssue, etc.
│   │   │   │   ├── tokens.ts      # DesignToken, ColorToken, etc.
│   │   │   │   ├── components.ts  # ComponentSpec, etc.
│   │   │   │   └── index.ts       # Re-exports
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── plugin/                    # Figma Plugin
│   │   ├── src/
│   │   │   ├── code.ts            # Sandbox entry point
│   │   │   ├── sandbox/           # All code.ts-side logic
│   │   │   │   ├── scanner.ts     # Scene graph traversal
│   │   │   │   ├── auditors/      # One per audit type
│   │   │   │   │   ├── hardcoded-colors.ts
│   │   │   │   │   ├── hardcoded-typography.ts
│   │   │   │   │   ├── hardcoded-spacing.ts
│   │   │   │   │   └── disconnected-components.ts
│   │   │   │   ├── injector.ts    # setPluginData + chunking
│   │   │   │   ├── change-detector.ts  # documentchange handler
│   │   │   │   └── messages.ts    # Message type definitions
│   │   │   ├── ui/                # React UI (iframe)
│   │   │   │   ├── main.tsx       # React entry
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── AuditTab.tsx
│   │   │   │   │   ├── ContextTab.tsx
│   │   │   │   │   ├── HealthDashboard.tsx
│   │   │   │   │   ├── FrameworkSelector.tsx
│   │   │   │   │   └── SyncIndicator.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── usePluginMessage.ts
│   │   │   │   │   └── useSyncState.ts
│   │   │   │   └── styles/
│   │   │   │       └── globals.css
│   │   │   └── shared/            # Shared between sandbox and UI
│   │   │       └── message-types.ts
│   │   ├── manifest.json          # Figma plugin manifest
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mcp-server/                # MCP Server
│       ├── src/
│       │   ├── index.ts           # Entry point, MCP server setup
│       │   ├── server.ts          # MCP server definition + tool registration
│       │   ├── figma/
│       │   │   ├── client.ts      # Figma REST API client
│       │   │   ├── chunk-reader.ts # Reconstruct chunked pluginData
│       │   │   └── types.ts       # Figma API response types
│       │   ├── cache/
│       │   │   ├── store.ts       # In-memory cache (Map-based)
│       │   │   └── types.ts       # CacheEntry, TTL config
│       │   ├── tools/
│       │   │   ├── get-component-specs.ts
│       │   │   ├── get-design-tokens.ts
│       │   │   └── get-audit-summary.ts
│       │   └── formatters/
│       │       ├── tailwind.ts
│       │       ├── css-variables.ts
│       │       ├── css-modules.ts
│       │       └── styled-components.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # Workspace root
├── tsconfig.base.json             # Shared TS config
├── .eslintrc.cjs                  # Shared ESLint config
├── .prettierrc                    # Shared Prettier config
└── vitest.config.ts               # Shared test config (if applicable)
```

### Structure Rationale

- **`packages/shared/`:** Single source of truth for the audit data schema. Both plugin and MCP server import these types. Changes to the data contract are caught at compile time. This package is never published -- it is consumed via workspace references.
- **`packages/plugin/`:** Self-contained Figma plugin. The `sandbox/` and `ui/` split mirrors Figma's own architecture (code.ts vs iframe). Auditors are isolated modules for testability.
- **`packages/mcp-server/`:** Self-contained MCP server. The `tools/` folder has one file per MCP tool. The `formatters/` folder handles CSS framework output variations.
- **Workspace root:** npm workspaces (or pnpm workspaces) manage cross-package dependencies. TypeScript project references enable incremental builds.

### Workspace Configuration

Use **npm workspaces** (simplest, no extra tooling):

```json
// Root package.json
{
  "name": "ai-ready-ds-auditor",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "build:shared": "npm run build -w packages/shared",
    "build:plugin": "npm run build -w packages/plugin",
    "build:mcp": "npm run build -w packages/mcp-server",
    "dev:plugin": "npm run dev -w packages/plugin",
    "lint": "eslint packages/*/src",
    "type-check": "tsc --build"
  }
}
```

Use **TypeScript project references** for type-safe cross-package imports:

```json
// Root tsconfig.json
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/plugin" },
    { "path": "packages/mcp-server" }
  ]
}
```

```json
// packages/plugin/tsconfig.json (example)
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "references": [
    { "path": "../shared" }
  ]
}
```

## Data Flow

### Primary Data Flow: Plugin to IDE

```
1. User clicks "Audit & Inject" in Plugin UI
         │
         ▼
2. UI sends postMessage({ type: "RUN_AUDIT" }) to sandbox
         │
         ▼
3. code.ts traverses scene graph:
   - figma.root.findAll() for components
   - Inspect fills, strokes, effects for hardcoded values
   - Check text nodes against text styles
   - Check auto-layout for hardcoded spacing
   - Collect variables, styles, components metadata
         │
         ▼
4. code.ts assembles AuditReport (shared type)
         │
         ▼
5. Injector serializes to JSON, checks size:
   - If < 95kB: single key "ai_audit_data"
   - If >= 95kB: chunk into 90kB pieces → ai_data_1, ai_data_2, ...
   - Always write ai_audit_meta with: { version, timestamp, chunkCount, cssFramework }
         │
         ▼
6. figma.root.setPluginData("ai_audit_meta", metaJSON)
   figma.root.setPluginData("ai_data_1", chunk1JSON)
   figma.root.setPluginData("ai_data_2", chunk2JSON)  // if needed
         │
         ▼
7. UI receives postMessage({ type: "AUDIT_COMPLETE", summary })
   Shows health dashboard with results
```

```
--- Later, in IDE ---

8. IDE spawns MCP server, user calls a tool (e.g., get_design_tokens)
         │
         ▼
9. MCP server checks in-memory cache for this file key
   - Cache HIT + fresh? → skip to step 12
   - Cache MISS or stale? → continue
         │
         ▼
10. MCP server calls Figma REST API:
    GET https://api.figma.com/v1/files/{file_key}/
    (pluginData is included in the response under document node)
         │
         ▼
11. Server reads ai_audit_meta → learns chunk count
    Reconstructs full JSON from ai_data_1 + ai_data_2 + ...
    Parses into typed AuditReport
    Stores in cache with TTL
         │
         ▼
12. Tool handler extracts relevant slice (tokens, components, or audit)
    Formatter applies CSS framework transformation if needed
    Returns structured JSON to IDE via MCP protocol
```

### Change Detection Flow

```
1. figma.on("documentchange", callback) fires
         │
         ▼
2. Debounce (2 seconds) to batch rapid changes
         │
         ▼
3. Check if changes affect audit-relevant properties:
   - Component additions/removals
   - Fill/stroke/effect changes
   - Text style changes
   - Auto-layout property changes
   - Variable binding changes
         │
         ▼
4. If relevant: set syncState = "out-of-sync"
   Send postMessage({ type: "SYNC_STATE", state: "out-of-sync" }) to UI
         │
         ▼
5. UI shows red "Out of Sync" indicator
   User can re-run audit to update
```

## Chunking Strategy Architecture

### The Problem

`setPluginData()` has a **100kB per-key limit** (as documented by Figma). A full audit of a large Design System file can easily exceed this.

### The Solution: Metadata + Ordered Chunks

```typescript
// Shared types (packages/shared)
interface AuditMeta {
  version: string;          // Schema version for forward compat
  timestamp: number;        // Unix ms when audit was run
  chunkCount: number;       // How many ai_data_N keys exist
  totalSize: number;        // Total uncompressed JSON size
  cssFramework: string;     // Selected framework
  fileKey: string;          // Figma file key for cross-reference
  checksum: string;         // Simple hash for integrity
}

// Key naming convention:
// "ai_audit_meta"  → always present, small (~500 bytes)
// "ai_data_1"      → first chunk (up to 90kB)
// "ai_data_2"      → second chunk (up to 90kB)
// ...
// "ai_data_N"      → Nth chunk
```

### Chunk Size: 90kB (not 95kB)

Use 90kB chunks, not 95kB. Reasons:
- 100kB is the hard limit
- JSON serialization of the chunk wrapper adds overhead
- UTF-8 encoding edge cases (multi-byte characters) can cause size to vary
- 90kB gives a comfortable 10% safety margin

### Writing Chunks (Plugin Side)

```typescript
// packages/plugin/src/sandbox/injector.ts
const CHUNK_SIZE = 90_000; // 90kB in bytes
const META_KEY = "ai_audit_meta";
const DATA_KEY_PREFIX = "ai_data_";

function injectAuditData(report: AuditReport, cssFramework: string): void {
  const json = JSON.stringify(report);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);

  // Clear old chunks first (important!)
  clearOldChunks();

  if (bytes.length <= CHUNK_SIZE) {
    figma.root.setPluginData(DATA_KEY_PREFIX + "1", json);
    writeMeta(1, bytes.length, cssFramework);
  } else {
    // Split JSON string into byte-safe chunks
    const chunks = splitIntoChunks(json, CHUNK_SIZE);
    for (let i = 0; i < chunks.length; i++) {
      figma.root.setPluginData(DATA_KEY_PREFIX + (i + 1), chunks[i]);
    }
    writeMeta(chunks.length, bytes.length, cssFramework);
  }
}

function clearOldChunks(): void {
  // Read meta to find previous chunk count, clear those keys
  const oldMeta = figma.root.getPluginData(META_KEY);
  if (oldMeta) {
    const parsed = JSON.parse(oldMeta) as AuditMeta;
    for (let i = 1; i <= parsed.chunkCount; i++) {
      figma.root.setPluginData(DATA_KEY_PREFIX + i, "");
    }
  }
}
```

### Reading Chunks (MCP Server Side)

```typescript
// packages/mcp-server/src/figma/chunk-reader.ts
function reconstructAuditData(pluginData: Record<string, string>): AuditReport {
  const meta = JSON.parse(pluginData["ai_audit_meta"]) as AuditMeta;

  let fullJson = "";
  for (let i = 1; i <= meta.chunkCount; i++) {
    const chunk = pluginData[`ai_data_${i}`];
    if (!chunk) throw new Error(`Missing chunk ai_data_${i}`);
    fullJson += chunk;
  }

  const report = JSON.parse(fullJson) as AuditReport;

  // Verify integrity
  if (computeChecksum(fullJson) !== meta.checksum) {
    throw new Error("Checksum mismatch - audit data may be corrupted");
  }

  return report;
}
```

### Key Design Decisions

1. **String concatenation, not JSON array of chunks.** Each chunk is a raw substring of the full JSON. Reconstruction is simple string concat. This avoids double-serialization overhead.

2. **Clear old chunks before writing new ones.** If a previous audit had 5 chunks and the new one has 3, stale chunks 4 and 5 would corrupt reconstruction. Always clear based on old meta.

3. **Checksum for integrity.** A simple hash (e.g., FNV-1a or CRC32) in the meta allows the MCP server to detect corruption or partial writes.

4. **Schema version in meta.** Enables forward compatibility -- MCP server can handle older audit formats gracefully.

## In-Memory Cache Architecture (MCP Server)

### Requirements
- Support multiple Figma files loaded simultaneously
- Avoid redundant API calls while cache is valid
- Single API call per file on session start
- Clear error handling for stale/missing data

### Design

```typescript
// packages/mcp-server/src/cache/store.ts

interface CacheEntry {
  fileKey: string;
  fileName: string;
  report: AuditReport;
  meta: AuditMeta;
  fetchedAt: number;       // Unix ms
  ttlMs: number;           // Default: 5 minutes
}

class DesignSystemCache {
  private entries: Map<string, CacheEntry> = new Map();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  async getOrFetch(fileKey: string, apiClient: FigmaClient): Promise<CacheEntry> {
    const cached = this.entries.get(fileKey);
    if (cached && !this.isStale(cached)) {
      return cached;
    }

    const { report, meta, fileName } = await apiClient.fetchAndReconstruct(fileKey);
    const entry: CacheEntry = {
      fileKey,
      fileName,
      report,
      meta,
      fetchedAt: Date.now(),
      ttlMs: this.defaultTtlMs,
    };
    this.entries.set(fileKey, entry);
    return entry;
  }

  private isStale(entry: CacheEntry): boolean {
    return Date.now() - entry.fetchedAt > entry.ttlMs;
  }

  invalidate(fileKey: string): void {
    this.entries.delete(fileKey);
  }

  listLoadedFiles(): Array<{ fileKey: string; fileName: string; fetchedAt: number }> {
    return Array.from(this.entries.values()).map(e => ({
      fileKey: e.fileKey,
      fileName: e.fileName,
      fetchedAt: e.fetchedAt,
    }));
  }
}
```

### Cache Strategy

- **Lazy loading:** Files are fetched on first tool call that references them, not at server startup. This avoids unnecessary API calls.
- **TTL-based staleness:** Default 5-minute TTL. After TTL, next tool call triggers a fresh fetch. Conservative enough to respect rate limits.
- **No automatic refresh:** Pull-based model only. The MCP server never polls Figma. This is intentional per project requirements.
- **Multi-file:** Map keyed by file key. Each file is independent. A user can work with multiple Design System files simultaneously.

### Why NOT a persistent cache (disk/SQLite)?

- MCP servers are spawned per IDE session. Session-scoped cache is appropriate.
- Audit data changes frequently (every time designer re-injects).
- Disk cache adds complexity (invalidation, migration) without clear benefit for a session-local tool.
- In-memory Map is fast, simple, and garbage-collected on process exit.

## Architectural Patterns

### Pattern 1: Message Bus Between Sandbox and UI

**What:** Define a strict, typed message protocol between code.ts and the UI iframe.
**When:** Always. This is the only communication channel.
**Trade-offs:** Adds boilerplate but prevents runtime errors from malformed messages.

```typescript
// packages/plugin/src/shared/message-types.ts

// Sandbox → UI messages
type SandboxMessage =
  | { type: "AUDIT_COMPLETE"; payload: { summary: AuditSummary } }
  | { type: "AUDIT_PROGRESS"; payload: { stage: string; percent: number } }
  | { type: "SYNC_STATE"; payload: { state: "synced" | "out-of-sync" } }
  | { type: "ERROR"; payload: { message: string; code: string } };

// UI → Sandbox messages
type UIMessage =
  | { type: "RUN_AUDIT" }
  | { type: "SET_FRAMEWORK"; payload: { framework: CSSFramework } }
  | { type: "EXPORT_JSON" }
  | { type: "UI_READY" };
```

### Pattern 2: Auditor Module Pattern

**What:** Each audit type (hardcoded colors, typography, spacing, disconnected components) is an independent module with the same interface.
**When:** For all audit logic in the plugin sandbox.
**Trade-offs:** More files, but each auditor is testable in isolation and new audit types can be added without modifying existing code.

```typescript
// packages/plugin/src/sandbox/auditors/types.ts
interface Auditor {
  name: string;
  audit(nodes: SceneNode[]): AuditIssue[];
}

// packages/plugin/src/sandbox/auditors/hardcoded-colors.ts
export const hardcodedColorsAuditor: Auditor = {
  name: "hardcoded-colors",
  audit(nodes) {
    const issues: AuditIssue[] = [];
    for (const node of nodes) {
      if ("fills" in node) {
        // Check if fills reference variables or are raw hex/rgb
      }
    }
    return issues;
  },
};
```

### Pattern 3: Tool Handler Isolation

**What:** Each MCP tool is a self-contained handler module that receives the cache and returns structured data.
**When:** For all MCP tool implementations.
**Trade-offs:** Slightly more indirection but each tool is independently testable and the server setup stays clean.

```typescript
// packages/mcp-server/src/tools/get-design-tokens.ts
import { DesignSystemCache } from "../cache/store.js";
import { formatTokens } from "../formatters/index.js";

export function getDesignTokensHandler(cache: DesignSystemCache) {
  return async (params: { fileKey: string; framework?: string }) => {
    const entry = await cache.getOrFetch(params.fileKey, figmaClient);
    const tokens = entry.report.tokens;
    const formatted = formatTokens(tokens, params.framework ?? "tailwind");
    return { content: [{ type: "text", text: JSON.stringify(formatted, null, 2) }] };
  };
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Audit Logic in the UI

**What people do:** Write audit/scanning code in the React UI because it feels more natural.
**Why it is wrong:** The UI iframe has zero access to `figma.*` APIs. Audit logic MUST run in the sandbox (code.ts). Any attempt to access the scene graph from UI code will fail silently or throw.
**Do this instead:** All Figma API interaction in `sandbox/`, all display logic in `ui/`. Communicate via typed postMessage.

### Anti-Pattern 2: Monolithic code.ts

**What people do:** Put all sandbox logic in a single code.ts file.
**Why it is wrong:** Figma plugins can grow complex. A 2000-line code.ts is unmaintainable. Vite can bundle multiple sandbox files into a single output.
**Do this instead:** Use the modular auditor pattern. code.ts is the entry point that imports and orchestrates modules. Vite bundles them into one file for Figma.

### Anti-Pattern 3: Fetching Figma API on Every Tool Call

**What people do:** Call the Figma REST API every time an MCP tool is invoked.
**Why it is wrong:** Figma free tier has rate limits. Each tool call would mean a full file fetch (can be megabytes for large files). Three tool calls in one AI conversation = three redundant fetches.
**Do this instead:** Fetch once, cache in memory, serve from cache. The cache TTL handles staleness.

### Anti-Pattern 4: HTTP Transport for Local MCP Server

**What people do:** Set up an Express/Fastify HTTP server for MCP communication.
**Why it is wrong:** Local MCP servers should use stdio transport. The IDE spawns the process and communicates over stdin/stdout. HTTP adds unnecessary complexity (port management, CORS, process lifecycle).
**Do this instead:** Use the `@modelcontextprotocol/sdk` with `StdioServerTransport`. Let the IDE manage the process.

### Anti-Pattern 5: Not Clearing Old Chunks

**What people do:** Write new chunks without removing old ones first.
**Why it is wrong:** If the previous audit had more chunks than the current one, stale chunks persist. The MCP server reads chunkCount from meta and concatenates, but if old data remains in higher-numbered keys, it could cause issues if meta gets corrupted or a different plugin version reads the data.
**Do this instead:** Always read old meta, clear all old chunk keys, then write new meta + chunks.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Figma REST API** | HTTP GET with Bearer token | Free tier: ~30 req/min (LOW confidence on exact limit). Single endpoint: `GET /v1/files/:key`. Plugin data is in `document.pluginData`. |
| **Figma Plugin API** | Synchronous JS in sandbox | `figma.root.setPluginData()`, `figma.root.getPluginData()`, `figma.root.findAll()`, `figma.on("documentchange")` |
| **MCP Protocol** | JSON-RPC 2.0 over stdio | Use `@modelcontextprotocol/sdk` package. Server declares tools with JSON Schema params. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Plugin Sandbox <-> Plugin UI | `postMessage` (async, serializable) | Typed message union. Never pass functions or class instances. |
| Plugin <-> Figma File | `setPluginData` / `getPluginData` (sync) | String only. JSON must be serialized/parsed. 100kB per key limit. |
| MCP Server <-> Figma REST API | HTTP (fetch/node-fetch) | Auth via Personal Access Token in env var. Response includes full file tree. |
| MCP Server <-> IDE | stdio (JSON-RPC) | `@modelcontextprotocol/sdk` handles framing. Tools return `{ content: [{type: "text", text: "..."}] }`. |
| Shared Types <-> Plugin/MCP | TypeScript imports | Compile-time only. No runtime dependency. Uses workspace references. |

## Build Order

The monorepo has a clear dependency graph that dictates build order:

```
packages/shared       ← Must build FIRST (no dependencies)
    ↓
packages/plugin       ← Depends on shared (imports types)
packages/mcp-server   ← Depends on shared (imports types)
                        (plugin and mcp-server are independent of each other)
```

### Recommended Implementation Order

1. **Phase 1: Shared types + Plugin scaffold** -- Define the audit data schema in shared/, set up the Vite-based plugin with basic sandbox/UI communication. This establishes the data contract that everything else depends on.

2. **Phase 2: Plugin audit engine** -- Implement scene traversal and auditors in the sandbox. Test with real Figma files. This is the hardest novel code.

3. **Phase 3: Plugin data injection** -- Implement chunking, setPluginData, change detection. At this point the plugin is functionally complete.

4. **Phase 4: MCP Server** -- Implement Figma API client, chunk reconstruction, cache, and tool handlers. This can consume real data injected by the plugin.

5. **Phase 5: Integration + Polish** -- End-to-end testing, CSS framework formatters, UI polish for Figma Community submission.

**Rationale:** Shared types first because they are the contract. Plugin before MCP server because the MCP server consumes data the plugin produces -- you need real audit data to develop the MCP server effectively.

## Scaling Considerations

| Concern | Small DS (50 components) | Medium DS (200 components) | Large DS (1000+ components) |
|---------|--------------------------|----------------------------|-----------------------------|
| Audit JSON size | ~20kB, single chunk | ~60-120kB, 1-2 chunks | ~300kB+, 3-4 chunks |
| Scan time | <1 second | 2-5 seconds | 10-30 seconds (needs progress UI) |
| MCP cache memory | ~50kB per file | ~200kB per file | ~500kB per file |
| Figma API response | ~500kB | ~2MB | ~10MB+ (parse time matters) |

### Scaling Priorities

1. **First bottleneck: Scan time in plugin.** Large files take time to traverse. Solution: show progress indicators, scan incrementally if possible, filter nodes early.

2. **Second bottleneck: Figma API response size.** The REST API returns the entire file tree, not just pluginData. For very large files, this can be megabytes. Solution: cache aggressively, extract only pluginData from the response, do not store the full response.

3. **Not a bottleneck: MCP server memory.** Even with 10 files loaded, we are talking about single-digit megabytes. Trivial for a Node.js process.

## Vite Configuration Notes (Plugin)

Figma plugins need a specific Vite setup because you are building TWO outputs:

1. **code.js** -- The sandbox bundle (no DOM, pure JS, single file)
2. **ui.html** -- The UI bundle (HTML with inlined JS/CSS for the iframe)

This requires either two Vite configs or a plugin that handles multi-entry. The common approach:

```typescript
// vite.config.ts (simplified concept)
// Option A: Two separate build steps
// npm run build:sandbox → builds code.ts → dist/code.js
// npm run build:ui → builds ui/main.tsx → dist/ui.html

// Option B: vite-plugin-figma or custom plugin
// Single build that outputs both
```

**Recommendation:** Use two separate Vite configs (`vite.config.code.ts` and `vite.config.ui.ts`) with corresponding build scripts. This is simpler to debug and maintain than a custom multi-output plugin.

The sandbox build must:
- Target `es2020` (Figma's V8 sandbox)
- Output IIFE or CJS (not ESM -- the sandbox does not support `import`)
- Not include any DOM polyfills
- Inline all dependencies (single file output)

The UI build must:
- Output a single HTML file with inlined CSS and JS
- Use `vite-plugin-singlefile` or equivalent to inline all assets
- Target modern browsers (Figma's Electron webview)

## Sources

- Figma Plugin API documentation (figma.com/plugin-docs/) -- MEDIUM confidence (not fetched live, based on training data)
- Model Context Protocol specification (modelcontextprotocol.io) -- MEDIUM confidence (not fetched live, based on training data)
- Figma REST API documentation (figma.com/developers/api) -- MEDIUM confidence
- npm workspaces documentation -- HIGH confidence (stable, well-known feature)
- TypeScript project references -- HIGH confidence (stable TypeScript feature)

**Note:** WebSearch, WebFetch, and Bash tools were unavailable during this research session. All Figma-specific claims (plugin sandbox model, setPluginData limits, REST API response structure, documentchange event) and MCP-specific claims (stdio transport, SDK usage, tool response format) are based on training data and should be verified against official documentation before implementation.

---
*Architecture research for: Figma Plugin + Local MCP Server (DesignOps tool)*
*Researched: 2026-03-02*
