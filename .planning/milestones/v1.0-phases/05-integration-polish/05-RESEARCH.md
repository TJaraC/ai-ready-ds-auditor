# Phase 5: Integration & Polish - Research

**Researched:** 2026-03-04
**Domain:** End-to-end pipeline validation, TypeScript type hygiene, bundle size, Figma Community submission
**Confidence:** HIGH

## Summary

Phase 5 is a cross-cutting validation and polish phase — no new functional requirements are introduced. Every requirement from REQUIREMENTS.md already has implementation in place; this phase verifies correctness end-to-end and brings the codebase to production-submission quality.

The codebase audit reveals: (1) one `any` usage in `inject.ts` protected by an explicit `eslint-disable-next-line` comment — this is a deliberate Figma sandbox workaround and will need a clean solution; (2) the plugin UI bundle is 203.87 kB raw / 63.68 kB gzip — well under the 200 kB gzip requirement; (3) the manifest.json is correctly structured for Figma API 1.0.0 with `dynamic-page` access and `"allowedDomains": ["none"]`; (4) all three MCP tools (`get_design_tokens`, `get_component_specs`, `get_audit_summary`) and all four CSS formatters are implemented and verified working in IDE. The remaining work is: eliminate the `any` cast in inject.ts, write the MCP server installation README, create the plugin Community listing assets (128×128 icon, 1920×1080 thumbnail), and run the full `npm run type-check` + `npm run lint` clean pass.

**Primary recommendation:** Organize Phase 5 into three focused plans: (1) TypeScript cleanup + lint zero-errors pass; (2) MCP server README and IDE integration documentation; (3) Figma Community listing assets + final end-to-end smoke test.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| Cross-cutting | End-to-end pipeline validation — no new requirements | All prior requirements already implemented; phase validates and polishes them |
| UI-10 | Plugin UI bundle size under 200 kB gzipped | Current: 63.68 kB gzip — already passing; verify after any changes |
| (All v1) | `npm run type-check` passes zero errors across all packages | One `any` cast to remove in inject.ts; ESLint rule `@typescript-eslint/no-explicit-any: error` already configured |
| SC-3 | Plugin manifest + UI meet Figma Community submission criteria | Manifest is valid; icon (128×128) and thumbnail (1920×1080) must be created |
| SC-4 | No `any` types in codebase | One instance found: `(globalThis as any).TextEncoder` in inject.ts |
</phase_requirements>

---

## Standard Stack

### Core (already in place — verify, do not change)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| TypeScript | ^5.9.3 | Strict type checking across all packages | Installed |
| `@modelcontextprotocol/sdk` | ^1.27.1 | MCP server with StdioServerTransport | Installed |
| `zod` | ^4.3.6 | Tool input schema validation | Installed |
| `@figma/plugin-typings` | ^1.123.0 | Figma sandbox API types | Installed |
| `react` / `react-dom` | ^19.2.4 | Plugin UI | Installed |
| `vite` + `vite-plugin-singlefile` | ^7.3.1 / ^2.3.0 | Single-file plugin UI build | Installed |
| `vitest` | ^4.0.18 | Unit tests (used in Phase 2 audit engine) | Installed |
| `eslint` + `typescript-eslint` | ^10.0.2 / ^8.56.1 | Linting; `@typescript-eslint/no-explicit-any: error` active | Installed |

### No New Dependencies Needed

Phase 5 introduces no new packages. All tooling is already configured.

---

## Architecture Patterns

### The `any` Problem in inject.ts

**What exists:**
```typescript
// packages/plugin/src/sandbox/inject.ts line 17
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TextEncoderCtor = (globalThis as any).TextEncoder as (new () => { encode(s: string): Uint8Array }) | undefined;
```

**Why it exists:** The Figma sandbox runs ES2019 (project decision from Phase 2 audit engine). `TextEncoder` is not in the ES2019 `lib` definition, so TypeScript does not know it exists on `globalThis`. The ESLint `no-explicit-any` rule is `error` — but this line has a disable comment that suppresses it. The `type-check` (`tsc --noEmit`) does not flag `eslint-disable` comments, so `npm run type-check` actually already passes zero errors. However, ESLint lint (`npm run lint`) will still pass too because of the `eslint-disable-next-line` comment.

**Verification needed:** Run `npm run lint` and `npm run type-check` from root to confirm both pass now, before making changes.

**Clean solution (no `any`):** Declare the ambient type in the sandbox's tsconfig or a `.d.ts` declaration file scoped to the sandbox. This keeps the Figma sandbox ES2019 target while telling TypeScript about `TextEncoder`:

```typescript
// packages/plugin/src/sandbox/global.d.ts
interface TextEncoderResult {
  encode(s: string): Uint8Array;
}
declare const TextEncoder: (new () => TextEncoderResult) | undefined;
```

With this declaration in place, `(globalThis as unknown as { TextEncoder?: new () => TextEncoderResult }).TextEncoder` or simply checking `typeof TextEncoder !== 'undefined'` would work without `any`.

**Alternative (simpler, correct):** Use `unknown` cast instead of `any`:
```typescript
const TextEncoderCtor = (globalThis as unknown as { TextEncoder?: new () => { encode(s: string): Uint8Array } }).TextEncoder;
```
This removes the `any` entirely. The ESLint `no-explicit-any` rule only bans `any`, not `unknown`. `unknown` is the type-safe alternative.

**Confidence:** HIGH — This is a known TypeScript pattern for accessing globals not in a restricted lib.

### Bundle Size Verification

**Current state (from dist directory listing):**
- `ui.html`: 203,873 bytes raw (~199 kB) / ~63.68 kB gzip (per additional context)
- `code.js`: 9,389 bytes raw
- `manifest.json`: 265 bytes

**Requirement UI-10:** Plugin UI bundle size stays under 200 kB gzipped.

**Status:** Already passing (63.68 kB gzip << 200 kB). No optimization work needed.

**How to verify:**
```bash
# From packages/plugin
npm run build
# Then measure gzip size of dist/ui.html
gzip -c dist/ui.html | wc -c
# Or in Node:
node -e "const fs=require('fs');const zlib=require('zlib');const buf=fs.readFileSync('dist/ui.html');zlib.gzip(buf,(e,r)=>console.log('gzip:',r.length,'bytes'));"
```

### TypeScript Project References and Type-Check

The root `npm run type-check` runs `tsc --build` which uses the root `tsconfig.json` with references to all three packages. Each package has its own `tsconfig.json`:
- `packages/shared`: emits CJS to `dist/`
- `packages/mcp-server`: emits CJS to `dist/`
- `packages/plugin`: `noEmit: true` (UI), separate `tsconfig.sandbox.json` for sandbox

**The type-check command:**
```bash
npm run type-check  # runs tsc --build from root
```

**What it covers:** All `.ts`/`.tsx` files included in each package's tsconfig. The sandbox `code.ts` is covered by `tsconfig.sandbox.json` (separate from `tsconfig.json` which covers the UI).

**Potential issue:** The root `tsconfig.json` references `{ "path": "packages/plugin" }` — this points to `packages/plugin/tsconfig.json` which covers the UI, not the sandbox. Verify whether the sandbox `tsconfig.sandbox.json` is also included in the project references or checked separately.

### MCP Server Configuration Formats

**Cursor** (`.cursor/mcp.json` or `~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "ai-ds-auditor": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_...",
        "FIGMA_FILE_KEYS": "ABC123,DEF456"
      }
    }
  }
}
```

**Trae IDE** (mcpServers array format):
```json
{
  "mcpServers": [
    {
      "name": "ai-ds-auditor",
      "command": ["node", "/absolute/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_...",
        "FIGMA_FILE_KEYS": "ABC123,DEF456"
      }
    }
  ]
}
```

**Key difference:** Cursor uses an object (`mcpServers: { name: {...} }`); Trae uses an array (`mcpServers: [{ name: "...", ... }]`). The `command` field in Trae is an array (command + args together). Both need absolute paths for the `node` binary or the script.

**Confidence:** MEDIUM — Verified from Cursor docs and Trae v1.3.0 release notes. Trae format is newer and may evolve.

### Figma Community Submission Requirements

**Manifest fields** (current manifest.json is compliant):
- `name`: "AI-Ready DS Auditor" ✓
- `id`: "1610802699324330019" ✓ (assigned by Figma during development)
- `api`: "1.0.0" ✓
- `main`: "dist/code.js" ✓
- `ui`: "dist/ui.html" ✓
- `editorType`: ["figma"] ✓
- `documentAccess`: "dynamic-page" ✓ (needed for multi-page support)
- `networkAccess.allowedDomains`: ["none"] ✓ (plugin makes no network requests — correct and preferred for trust)

**Missing for Community submission (assets, not code):**
1. **Plugin icon**: 128×128 px PNG — displayed in Community listing and plugin manager
2. **Thumbnail/cover image**: 1920×1080 px — displayed as preview on Community page (recommended, not strictly required but effectively required for discovery)
3. **Short tagline**: Written description for the Community listing
4. **Full description**: Features + how-to-use text for the Community listing
5. **Support contact**: Email or URL for user support

**Review process:** Figma reviews submissions within 5-10 business days. Plugin gets "In review" badge then "Published" badge.

**Confidence:** HIGH (verified via Figma's official help docs).

### End-to-End Pipeline Smoke Test

**The full pipeline that must work:**
1. Designer opens Figma file with components and variables
2. Runs "AI-Ready DS Auditor" plugin
3. Clicks "Audit & Inject" — plugin scans document, writes chunked pluginData
4. Opens IDE (Cursor/Trae), asks agent to call `get_design_tokens`
5. MCP server receives tool call, fetches Figma file via REST API, reconstructs chunks, returns tokens
6. Agent receives formatted tokens (Tailwind/CSS-Variables/etc.)
7. Designer can also call `get_component_specs` by name and `get_audit_summary` with category filter

**Verification script approach:** Since this is a human-in-the-loop flow (requires a real Figma file and IDE), the smoke test is documented as a human checkpoint, not an automated test. The existing `utils.test.ts` covers audit utility functions. No new automated tests are needed for the integration flow.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gzip size measurement | Custom compression script | `gzip -c dist/ui.html \| wc -c` or Node `zlib.gzip()` | Standard tooling is sufficient |
| MCP server config docs | Custom config validator | Document the exact JSON shape for Cursor and Trae | IDEs validate their own config |
| Icon creation | Programmatic PNG generation | Create 128×128 PNG in any image tool (Figma itself is appropriate) | One-time asset, not code |
| TypeScript `any` ban enforcement | Custom linter | `@typescript-eslint/no-explicit-any: error` already active in eslint.config.ts | Already configured |

---

## Common Pitfalls

### Pitfall 1: Sandbox tsconfig Not Covered by Root type-check

**What goes wrong:** `npm run type-check` (runs `tsc --build` with root tsconfig.json) references `packages/plugin` which points to `tsconfig.json` covering only the UI (`src/ui/**/*`). The sandbox `tsconfig.sandbox.json` covers `src/sandbox/**/*` separately. If the sandbox tsconfig is not referenced, `tsc --build` won't check sandbox code.

**How to avoid:** Verify that either (a) `packages/plugin/tsconfig.json` includes sandbox files, or (b) there is a separate reference to `tsconfig.sandbox.json`. Check by running `tsc --build --listFiles` and confirming `code.ts` and `inject.ts` appear.

**Warning sign:** `npm run type-check` passes but errors exist in `src/sandbox/`.

### Pitfall 2: The `any` in inject.ts Fails Lint But Not Type-Check

**What goes wrong:** The `eslint-disable-next-line @typescript-eslint/no-explicit-any` comment means `npm run lint` passes (the disable comment suppresses the error) but the intent of SC-4 ("No `any` types exist in the codebase") is still violated if read literally. The success criterion says zero `any` types — the disable comment is the canonical escape hatch.

**Resolution:** The two valid readings are (a) remove the `any` with the `unknown` cast approach (fully clean), or (b) accept the disable comment as "intentional and documented `any` that ESLint has approved." The safer interpretation for passing review is to actually replace `any` with `unknown`.

**How to avoid:** Use `unknown` cast: `(globalThis as unknown as { TextEncoder?: new () => {...} }).TextEncoder`.

### Pitfall 3: Absolute Paths in MCP Config Differ Per Machine

**What goes wrong:** MCP server config in Cursor/Trae requires an absolute path to `dist/index.js`. The README shows a path like `/Users/alice/projects/...` but users need to substitute their own path.

**How to avoid:** Document the path template clearly; consider offering an `npx`-style invocation if the server is ever published to npm. For v1 (local-only), absolute path is the correct approach. Document as a setup step, not a bug.

### Pitfall 4: Figma Free Plan Rate Limit During Smoke Test

**What goes wrong:** The free Figma Starter plan allows only 6 GET /v1/files requests per month. If multiple smoke test iterations exhaust the quota, the MCP server returns `FigmaMonthlyLimitError` and the tester cannot verify.

**How to avoid:** Cache is session-scoped (in-memory). Each new MCP server session consumes one API call per configured file. Keep smoke tests in a single long-running server session to avoid re-fetching.

### Pitfall 5: Plugin Community Submission Without 2FA

**What goes wrong:** Figma requires two-factor authentication (2FA) enabled on the publisher account before publishing to the Community.

**How to avoid:** Ensure 2FA is enabled on the Figma account before attempting submission.

---

## Code Examples

### Removing `any` with `unknown` cast (inject.ts fix)

```typescript
// Source: TypeScript handbook — unknown as safe cast for ambient globals
// packages/plugin/src/sandbox/inject.ts

type TextEncoderLike = { encode(s: string): Uint8Array };

const TextEncoderCtor = (
  globalThis as unknown as { TextEncoder?: new () => TextEncoderLike }
).TextEncoder;

const totalBytes: number =
  typeof TextEncoderCtor === 'function'
    ? new TextEncoderCtor().encode(json).length
    : json.length;
```

This removes the `any` cast and the `eslint-disable` comment while preserving the runtime behavior exactly.

### Verifying bundle gzip size (Node.js)

```javascript
// Run from packages/plugin after npm run build
const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('dist/ui.html');
zlib.gzip(buf, (err, result) => {
  const kb = (result.length / 1024).toFixed(1);
  const pass = result.length < 200 * 1024;
  console.log(`ui.html gzip: ${kb} kB — ${pass ? 'PASS' : 'FAIL'} (limit: 200 kB)`);
});
```

### Cursor mcp.json configuration example

```json
{
  "mcpServers": {
    "ai-ds-auditor": {
      "command": "node",
      "args": ["ABSOLUTE_PATH_TO/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  }
}
```

### Trae MCP configuration example

```json
{
  "mcpServers": [
    {
      "name": "ai-ds-auditor",
      "command": ["node", "ABSOLUTE_PATH_TO/packages/mcp-server/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_your_personal_access_token",
        "FIGMA_FILE_KEYS": "YOUR_FIGMA_FILE_KEY"
      }
    }
  ]
}
```

### Running the full verification suite

```bash
# From repo root
npm run build          # Compiles all packages
npm run type-check     # tsc --build — zero errors required
npm run lint           # ESLint across all packages — zero errors required
npm test               # Vitest — all units green

# Then manual smoke test:
# 1. Load plugin in Figma Desktop
# 2. Click Audit & Inject on a real file
# 3. Start MCP server: node packages/mcp-server/dist/index.js
# 4. Call get_design_tokens from IDE — verify token output
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Global `mcp.json` only | Project-scoped `.cursor/mcp.json` + global `~/.cursor/mcp.json` | Users can have per-project Figma config |
| Tailwind v4 `@theme` CSS syntax | Tailwind v3 JS config object (project decision) | Compatible with the majority of existing Tailwind projects |
| Figma plugin `document` access | `dynamic-page` documentAccess | Required for multi-page Figma files |

---

## Open Questions

1. **Sandbox tsconfig in project references**
   - What we know: `tsconfig.json` at plugin root covers `src/ui/**/*` and `vite.config.*.ts`; `tsconfig.sandbox.json` covers sandbox code separately
   - What's unclear: Whether root `tsc --build` checks the sandbox tsconfig at all
   - Recommendation: In Wave 1, run `tsc --build --listFiles 2>&1 | grep sandbox` to verify; if sandbox files are absent, add a project reference or include the sandbox tsconfig

2. **Icon and thumbnail asset creation**
   - What we know: 128×128 px icon and 1920×1080 thumbnail are needed; no icon exists yet
   - What's unclear: Whether to create them as part of Phase 5 code tasks or as a manual step
   - Recommendation: Include icon/thumbnail creation as a task in the Community submission plan; the implementer creates the PNG file programmatically (e.g., a 128×128 filled SVG converted to PNG) or manually — both are valid

3. **Plugin ID in manifest for published version**
   - What we know: `manifest.json` has `"id": "1610802699324330019"` which was assigned by Figma during development
   - What's unclear: Whether this ID is automatically used for Community publication or whether Figma assigns a new ID
   - Recommendation: This ID is the developer's plugin ID and IS the Community listing ID — no change needed

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not present in `.planning/config.json` (the config uses `workflow.research`, `workflow.plan_check`, `workflow.verifier`). There is no `nyquist_validation` key, so this section is omitted.

---

## Sources

### Primary (HIGH confidence)
- Figma official help — [Publish plugins to the Figma Community](https://help.figma.com/hc/en-us/articles/360042293394-Publish-plugins-to-the-Figma-Community) — step-by-step publishing process, icon/thumbnail specs
- Figma official help — [Plugin and widget review guidelines](https://help.figma.com/hc/en-us/articles/360039958914-Plugin-and-widget-review-guidelines) — quality standards and review criteria
- Figma official developer docs — [Plugin Manifest](https://developers.figma.com/docs/plugins/manifest/) — required/optional manifest fields, editorType values
- Codebase inspection — `packages/plugin/src/sandbox/inject.ts` line 17 — confirmed single `any` usage
- Codebase inspection — `packages/plugin/dist/ui.html` — 203,873 bytes raw → 63.68 kB gzip (per additional context)
- Codebase inspection — all three MCP tools implemented and verified in `packages/mcp-server/src/tools/`
- Codebase inspection — `eslint.config.ts` — `@typescript-eslint/no-explicit-any: error` confirmed active

### Secondary (MEDIUM confidence)
- Trae IDE release notes — [Trae IDE v1.3.0 MCP Support](https://traeide.com/news/6) — stdio/SSE configuration format, array-style mcpServers
- Cursor docs — [Model Context Protocol](https://docs.cursor.com/context/model-context-protocol) — mcp.json format with command/args/env

### Tertiary (LOW confidence)
- WebSearch findings re: Figma Community 15MB bundle limit — mentioned in forum discussions but not in official docs; our 63 kB gzip is far below any plausible limit

---

## Metadata

**Confidence breakdown:**
- TypeScript `any` removal: HIGH — code directly inspected; solution is well-known TypeScript pattern
- Bundle size: HIGH — dist file inspected; gzip size from additional context + verified with formula
- Figma Community submission: HIGH — official Figma help docs consulted directly
- MCP config format (Cursor): HIGH — official Cursor docs
- MCP config format (Trae): MEDIUM — Trae v1.3.0 release notes; Trae is newer and format may evolve
- Sandbox tsconfig coverage: MEDIUM — logic inferred from tsconfig files; needs runtime verification

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (Figma Community requirements are stable; MCP client config formats may shift faster)
