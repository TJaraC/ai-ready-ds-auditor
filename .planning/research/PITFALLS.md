# Pitfalls Research

**Domain:** Figma Plugin + Local MCP Server (DesignOps / Design System Auditor)
**Researched:** 2026-03-02
**Confidence:** MEDIUM (based on training data — WebSearch/WebFetch/Brave unavailable for live verification)

## Critical Pitfalls

### Pitfall 1: Figma Plugin Sandbox — Treating code.ts and UI as One Runtime

**What goes wrong:**
Developers write plugin code assuming `code.ts` (the main thread sandbox) and the UI iframe share memory, globals, or can import each other's modules. They try to access DOM APIs from `code.ts`, or call `figma.*` APIs from the UI iframe. Both fail silently or throw cryptic errors.

**Why it happens:**
The Figma plugin model is unusual. `code.ts` runs in a sandboxed main-thread environment with access to the `figma` API but NO DOM, NO `window`, NO `fetch`, NO `setTimeout` (only `figma.timer`). The UI runs in an `<iframe>` with full browser APIs but ZERO access to the `figma` object. Communication is exclusively via `figma.ui.postMessage()` and `onmessage` handlers.

**How to avoid:**
- Establish a strict message-passing protocol from day one. Define a TypeScript discriminated union for all message types:
  ```typescript
  type PluginMessage =
    | { type: 'SCAN_REQUEST'; payload: ScanOptions }
    | { type: 'SCAN_RESULT'; payload: AuditResult }
    | { type: 'ERROR'; payload: { code: string; message: string } }
  ```
- Put ALL Figma API calls in `code.ts`. Put ALL DOM/React rendering in the UI iframe.
- Never try to pass non-serializable objects (Figma SceneNodes, functions, class instances) across the bridge — only plain JSON.
- Create a shared `types/` directory importable by both sides for message type definitions.

**Warning signs:**
- Importing `figma` in UI code or `document` in code.ts
- TypeScript errors about missing globals
- Plugin loads but UI is blank (UI crashed silently)
- "Cannot clone" errors in the console (non-serializable postMessage)

**Phase to address:** Phase 1 (Project scaffolding) — the message protocol must be the first thing designed.

---

### Pitfall 2: setPluginData 100kB Limit — Silent Truncation and Corruption

**What goes wrong:**
`setPluginData(key, value)` accepts a string value. The per-key limit is approximately 100kB (100,000 bytes). When you exceed this, the call can fail silently or throw. Developers discover this only when their audit data grows beyond a trivial design system, causing data loss or corrupted JSON that breaks the MCP server downstream.

**Why it happens:**
Small test files produce small JSON. The limit is not hit during development. Production design systems with hundreds of components, thousands of tokens, and detailed audit issues easily exceed 100kB. UTF-8 encoding means some characters use multiple bytes, so string length !== byte length.

**How to avoid:**
- Implement chunking from the start, not as an afterthought. Use a 95kB threshold (as specified in PROJECT.md) to leave safety margin.
- Use `TextEncoder` to measure actual byte length, not `string.length`:
  ```typescript
  const byteLength = new TextEncoder().encode(jsonString).length;
  ```
- Chunk strategy: Write a manifest key (`ai_data_manifest`) containing `{ chunkCount: N, version: string, timestamp: number }` plus data keys `ai_data_1`, `ai_data_2`, etc.
- Always write manifest LAST so readers can detect incomplete writes.
- On read, validate chunk count matches manifest before reconstructing.
- Clear old chunks when rewriting (if chunk count decreases, leftover `ai_data_N` keys from previous writes will corrupt data).

**Warning signs:**
- Tests pass with small fixtures but fail with real design system files
- MCP server receives truncated or malformed JSON
- `JSON.parse()` throws on reconstructed data
- Byte length measurements not present in chunking code

**Phase to address:** Phase 1 (Core plugin engine) — chunking is a core data layer concern, not a feature to add later.

---

### Pitfall 3: Figma REST API — Exhausting Rate Limits on Startup

**What goes wrong:**
The MCP server calls the Figma REST API too aggressively — fetching file data, then components, then styles in separate calls — and hits rate limits (HTTP 429). On the free tier, limits are strict (approximately 30 requests/minute per token, though exact numbers are not publicly documented with precision). The server becomes unusable or gets temporarily blocked.

**Why it happens:**
Developers build the MCP server with multiple API endpoints (GET /v1/files/:key, GET /v1/files/:key/components, GET /v1/files/:key/styles) and call them eagerly on startup or on every tool invocation. With multiple files loaded simultaneously, the call count multiplies.

**How to avoid:**
- Single API call architecture: Use `GET /v1/files/:file_key` which returns the full file tree including components, styles, and plugin data in one response. Avoid supplementary endpoints unless strictly necessary.
- Cache aggressively: Load once per session, serve from memory. The PROJECT.md already specifies this — enforce it strictly.
- Implement exponential backoff with jitter for 429 responses.
- Add a rate limiter (e.g., p-queue with concurrency 1 and interval of 2 seconds) for any API calls.
- For multi-file support: stagger initial loads, do not fetch all files in parallel.
- Surface cache age to the user so they know when data might be stale.

**Warning signs:**
- Multiple Figma API imports/calls scattered across the codebase (should be centralized)
- No retry/backoff logic around fetch calls
- Tests mock away HTTP entirely so rate-limit bugs never surface
- Users report "403" or "429" errors shortly after starting the server

**Phase to address:** Phase 2 (MCP server core) — the API client with rate limiting must be built as a single module before any tools are added.

---

### Pitfall 4: MCP Protocol — Incorrect Tool Schema or Transport Handling

**What goes wrong:**
The MCP server implements tool definitions with schemas that don't match what clients (Cursor, Trae) expect, causing tools to not appear, parameters to be silently dropped, or invocations to fail with opaque errors. Alternatively, stdio transport is implemented incorrectly — mixing stdout logging with protocol messages, or not handling JSON-RPC framing properly.

**Why it happens:**
The MCP protocol (Model Context Protocol) is relatively new. Documentation is evolving. Developers implement from examples that may be outdated. The JSON-RPC 2.0 over stdio transport requires that ONLY protocol messages go to stdout — any `console.log()` statement corrupts the transport. Tool schemas must use JSON Schema draft compatible with the client's expectations.

**How to avoid:**
- Use the official `@modelcontextprotocol/sdk` package — do not hand-roll the protocol layer. It handles JSON-RPC framing, transport, and schema validation.
- NEVER use `console.log()` in an stdio-transport MCP server. Use `console.error()` (which goes to stderr) for debugging, or use the SDK's built-in logging facilities.
- Define tool input schemas as strict JSON Schema objects. Test that each tool's schema parses correctly with a JSON Schema validator.
- Test with at least two MCP clients (Cursor and a CLI client like `mcp-cli` or `npx @anthropic-ai/claude-code`) to catch client-specific quirks.
- Return structured error responses (not thrown exceptions) when tools fail — clients need the error in the MCP response format.

**Warning signs:**
- `console.log` anywhere in the MCP server source code
- Tools defined but not appearing in client tool lists
- "Parse error" or "Invalid request" from the MCP client
- Tool calls succeed in tests but fail in actual IDE integration

**Phase to address:** Phase 2 (MCP server core) — transport and tool registration must be validated against real clients before building individual tools.

---

### Pitfall 5: Figma REST API 403 on Private Files — Confusing Error Experience

**What goes wrong:**
Users configure their Figma file key and personal access token, but the file's sharing settings are "Only people invited" rather than "Anyone with the link can view." The REST API returns 403 Forbidden. Without clear error handling, users see a cryptic failure and assume the tool is broken.

**Why it happens:**
The project explicitly requires "Anyone with link can view" permissions (per PROJECT.md constraints). But this is a non-obvious Figma setting that most designers don't think about. The 403 response body from Figma's API is not always descriptive.

**How to avoid:**
- Detect 403 specifically and return a clear, actionable error message:
  ```
  "Cannot access file. Please ensure:
  1. Your Personal Access Token is valid (Settings > Account > Personal Access Tokens)
  2. The file's sharing is set to 'Anyone with the link can view'
     (File menu > Share > Change link sharing)
  3. The file key is correct (the part after /design/ in the Figma URL)"
  ```
- Implement a `validate_connection` tool or startup check that tests API access before loading data.
- Cache the token validity state so repeated failures don't spam the API.

**Warning signs:**
- Generic "request failed" error messages in the MCP server
- No specific HTTP status code handling (treating all errors the same)
- User complaints about "not working" without actionable guidance

**Phase to address:** Phase 2 (MCP server core) — error handling is part of the API client module.

---

### Pitfall 6: Plugin Data Schema Versioning — Breaking the MCP Server on Plugin Updates

**What goes wrong:**
The plugin writes structured JSON via `setPluginData()`. The MCP server reads and parses it. When the plugin's data schema changes (new fields, renamed fields, restructured audit results), the MCP server breaks on files that were injected with the old schema. Alternatively, files injected by a newer plugin version confuse an older MCP server.

**Why it happens:**
Schema evolution is not planned from the start. The JSON blob has no version marker. Both components evolve independently — a user might update the plugin but not the MCP server, or vice versa.

**How to avoid:**
- Include a `schemaVersion` field in the root of every JSON payload from day one (e.g., `"schemaVersion": 1`).
- MCP server must check `schemaVersion` and:
  - If known: parse accordingly
  - If unknown/higher: return a clear "please update MCP server" error
  - If missing: treat as v0 / legacy and attempt best-effort parse with warnings
- Never remove fields — only add. If restructuring is needed, bump the schema version and support both old and new in the MCP server for at least one version cycle.
- Document the schema in a shared TypeScript types package importable by both plugin and server.

**Warning signs:**
- No `schemaVersion` or `version` field in the plugin's JSON output
- MCP server uses `any` types or unsafe casts when parsing plugin data
- Plugin and server live in separate repos with no shared type definitions

**Phase to address:** Phase 1 (Data schema design) — version field must be in the first schema definition.

---

### Pitfall 7: React in Figma Plugin iframe — Bundle Size and CSP Issues

**What goes wrong:**
The plugin UI bundle becomes too large (>500kB), causing slow plugin startup. Or Content Security Policy restrictions in the Figma iframe block certain React patterns (inline styles with `style-src`, eval-based tooling).

**Why it happens:**
Figma plugin UIs run inside a sandboxed iframe served from `null` origin. Figma's CSP is restrictive. React + a UI framework like MUI or Chakra can easily produce 300-500kB+ bundles. Developers add libraries without considering the constrained environment.

**How to avoid:**
- Use lightweight UI: Preact (3kB) instead of React (40kB) if feasible, or ensure tree-shaking is aggressive with React.
- Avoid heavy UI libraries. Use Figma's own design tokens and simple CSS for the plugin UI. Consider `@create-figma-plugin/ui` which is purpose-built and lightweight.
- Configure Vite to inline all assets into a single HTML file (Figma plugins require a single HTML file for UI — no external imports at runtime).
- Measure bundle size in CI. Set a budget (e.g., 200kB gzipped max).
- Avoid `eval()`, `new Function()`, and libraries that use them — CSP will block them.
- All CSS must be inlined or in `<style>` tags, not loaded from external URLs.

**Warning signs:**
- Plugin takes >2 seconds to show UI
- Console errors mentioning CSP violations
- External `<link>` or `<script src="...">` tags in the UI HTML
- Bundle analyzer showing large unused dependencies

**Phase to address:** Phase 1 (Scaffolding/Bundler config) — Vite config for single-file output must be set up from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip chunking, assume data fits in 100kB | Faster initial dev | Breaks on real design systems, requires rewrite of data layer | Never — implement from start |
| `any` types for Figma API responses | Faster prototyping | Runtime crashes from unexpected response shapes, no IDE help | Never in this project (TypeScript strict mode required) |
| `console.log` for MCP server debugging | Quick debugging | Corrupts stdio transport, mysterious client failures | Never — use stderr from day one |
| Hardcode single-file support in MCP server | Simpler initial architecture | Rewrite when adding multi-file (PROJECT.md requires multi-file in v1) | Never — design for multi-file from start |
| Skip schema versioning | Less boilerplate | Breaking changes between plugin/server versions are unrecoverable | Never — add version field immediately |
| Inline all Figma API types manually | No dependency | Drift from actual API responses, maintenance burden | Only for MVP if official types package unavailable; replace ASAP |
| Skip error boundaries in React UI | Faster UI dev | Plugin crashes show blank iframe with no info | Only in earliest prototype, add before any user testing |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Figma REST API | Using multiple endpoints (files, components, styles separately) | Use single `GET /v1/files/:key` call — it includes everything including pluginData |
| Figma REST API | Not URL-encoding file keys with special characters | Always encodeURIComponent the file key extracted from URLs |
| Figma REST API | Assuming `pluginData` appears at file root | pluginData is per-node; use `root.pluginData` or iterate document nodes depending on where plugin wrote data |
| Figma postMessage | Sending SceneNode references across the bridge | Serialize to plain objects — extract only needed properties (id, name, type, etc.) before sending |
| Figma postMessage | Not handling message race conditions | UI might send messages before code.ts is ready; queue messages or use a handshake protocol |
| MCP stdio transport | Writing anything to stdout besides JSON-RPC messages | Redirect ALL logging to stderr; use SDK logger |
| MCP tool responses | Returning raw objects instead of content blocks | MCP tools must return `{ content: [{ type: "text", text: "..." }] }` format |
| MCP tool responses | Throwing exceptions on invalid input | Return `isError: true` with descriptive message in content — thrown exceptions may crash the server |
| Personal Access Token | Storing token in plugin data or Figma file | Token lives ONLY in MCP server config (local .env or config file) — never in the Figma file |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scanning entire Figma document tree on every audit | Plugin UI freezes for 5-30 seconds on large files | Scan incrementally; use `figma.currentPage` scope option; show progress bar | Files with >500 layers |
| Not debouncing `documentchange` listener | Plugin constantly re-scans during active design work, freezing Figma | 2-second debounce (as specified in PROJECT.md); only flag "out of sync" rather than auto-rescan | Any active editing |
| Parsing full file JSON in MCP server on every tool call | Tool responses take seconds instead of milliseconds | Parse once on load, build indexed data structures (maps by component name, by token type) | Files >5MB JSON response |
| Reconstructing chunks on every MCP tool invocation | Repeated string concatenation and JSON.parse for each request | Reconstruct once at session start, cache parsed result in memory | Always wasteful, but noticeable with >3 chunks |
| Large Figma API response not streamed | Node.js buffers entire response in memory; OOM on very large files | Use streaming JSON parser or accept the memory cost but set a file size limit with clear error | Files >50MB (rare but possible with images) |
| Plugin UI re-rendering on every scan progress update | React re-renders the full component tree for each progress tick | Throttle UI updates to max 10/second; use React.memo or state batching | Scans with >100 progress events |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Figma Personal Access Token in pluginData | Token is readable by anyone who can access the file, or any other plugin | Token goes ONLY in MCP server-side config (.env file, never committed to git) |
| Exposing token in MCP tool responses | AI assistant could echo the token in conversations, logs | Never include the token in any tool response content; redact from error messages |
| No input validation on MCP tool parameters | Malicious or malformed input could cause crashes or unexpected behavior | Validate all tool inputs with JSON Schema (the SDK does this if schemas are defined) and sanitize strings |
| Plugin requesting unnecessary Figma scopes | Rejection during Figma Community review; user distrust | Request only `currentuser:read` (if needed) and file read access; no write scopes for v1 |
| Logging full API responses including sensitive data | Token or file content leaks to log files | Sanitize logs; never log Authorization headers or full response bodies |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indication during scan | Users think plugin is frozen, force-close it | Show a progress bar with phase labels ("Scanning components...", "Detecting hardcoded colors...") |
| Audit results shown as raw JSON | Designers cannot interpret technical output | Visual dashboard with severity badges, counts, and expandable detail rows |
| "Out of Sync" indicator without explanation | Users don't know what changed or what to do | Show "3 layers modified since last scan — click Update to re-audit" |
| MCP server silent on startup | Users don't know if it's running or connected | Log startup banner to stderr: "MCP Server ready. Loaded N files. Tools available: ..." |
| No guidance when zero issues found | Users wonder if the scan actually worked | Show explicit "Scan complete: 142 components checked, 0 issues found" with green checkmark |
| CSS framework selector with no preview | Users pick wrong framework, get confusing token output | Show a small code preview snippet for each framework option |

## "Looks Done But Isn't" Checklist

- [ ] **Chunking:** Tests only use small payloads — verify with a 200kB+ realistic audit payload
- [ ] **Multi-file MCP:** Single file works — verify two files loaded simultaneously with overlapping component names
- [ ] **Plugin data write:** setPluginData succeeds — verify read-back from REST API returns same data (encoding issues can cause drift)
- [ ] **documentchange listener:** Basic changes trigger it — verify it handles undo/redo, paste, and plugin-initiated changes correctly
- [ ] **MCP tool schemas:** Tools appear in Cursor — verify they also appear in Trae (different schema interpretation)
- [ ] **Error messages:** Happy path works — verify 403, 429, network timeout, invalid token, malformed pluginData all produce actionable errors
- [ ] **Bundle output:** Vite builds succeed — verify the output is a SINGLE HTML file with all JS/CSS inlined (Figma requirement)
- [ ] **TypeScript strict:** Code compiles — verify `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`
- [ ] **Plugin manifest:** Plugin runs locally — verify `manifest.json` has correct `api` version, `editorType`, and network access permissions for Figma Community submission
- [ ] **Token cleanup:** Data loads in MCP — verify stale/orphaned chunk keys are cleaned up when chunk count decreases on re-injection

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No schema versioning | MEDIUM | Add version field, write migration logic in MCP server for v0 (unversioned) data, re-inject from plugin |
| stdout corruption in MCP | LOW | Replace all `console.log` with `console.error`, restart server; no data loss |
| Chunking not implemented | HIGH | Requires rewriting the data layer in both plugin and MCP server; all existing injected files need re-injection |
| Rate limit exhaustion | LOW | Implement backoff, wait for limit reset (usually 1 minute), retry; no permanent damage |
| Bundle too large | MEDIUM | Audit dependencies, replace heavy libraries, configure tree shaking; may require UI library swap |
| Plugin rejected by Figma Community | MEDIUM | Fix rejection issues (usually manifest, permissions, or UI quality), resubmit; 3-7 day review cycle each time |
| Data corruption from missing chunk cleanup | MEDIUM | Add cleanup logic, re-inject all files from plugin; users must re-run audit on each file |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Sandbox message passing | Phase 1: Scaffolding | Message type union compiles; round-trip test passes |
| setPluginData chunking | Phase 1: Core engine | Test with 200kB+ payload; verify REST API read-back |
| Schema versioning | Phase 1: Data schema | `schemaVersion` field present in every JSON output |
| React bundle size | Phase 1: Bundler config | Bundle size <200kB measured in build output |
| Single-file HTML output | Phase 1: Bundler config | Vite produces one HTML file with zero external references |
| REST API rate limiting | Phase 2: API client | Rate limiter module exists; 429 retry logic tested |
| 403 error handling | Phase 2: API client | Specific error message shown for 403 with instructions |
| MCP stdio transport | Phase 2: MCP server core | Zero `console.log` in server code; lint rule enforces it |
| MCP tool schemas | Phase 2: Tool definitions | Tools appear in both Cursor and Trae |
| Multi-file support | Phase 2: MCP architecture | Two files loaded simultaneously without interference |
| documentchange debounce | Phase 3: Sync indicators | Rapid edits don't cause multiple scans |
| Plugin UI quality | Phase 3: UI polish | Manual review against Figma Community guidelines |
| Figma Community submission | Phase 4: Distribution | Manifest complete; permissions minimal; UI polished |
| Token security | All phases | No token in pluginData, tool responses, or logs; verified by grep |

## Sources

- Figma Plugin API documentation (figma.com/plugin-docs) — sandbox model, setPluginData API, publishing guidelines [MEDIUM confidence — from training data, not live-verified]
- Figma REST API documentation (figma.com/developers/api) — rate limits, file endpoint, pluginData access [MEDIUM confidence — from training data]
- Model Context Protocol specification (modelcontextprotocol.io) — architecture, stdio transport, tool schema format [MEDIUM confidence — from training data]
- @modelcontextprotocol/sdk package patterns — tool definition, error handling, transport setup [MEDIUM confidence — from training data]
- Community discussions and post-mortems on Figma plugin development — common mistakes, CSP issues, bundle constraints [LOW confidence — from training data, not verified with current sources]

**Note:** WebSearch, WebFetch, and Brave Search were all unavailable during this research session. All findings are based on training data (cutoff: May 2025). Specific numbers (rate limits, exact byte limits) should be verified against current official documentation before implementation.

---
*Pitfalls research for: Figma Plugin + Local MCP Server (DesignOps)*
*Researched: 2026-03-02*
