# Stack Research

**Domain:** Figma Plugin (DesignOps) + Local MCP Server
**Researched:** 2026-03-02
**Confidence:** MEDIUM (all versions from training data -- could not verify against live npm registry; verify with `npm view <pkg> version` before installing)

## Important Note on Confidence

WebSearch, Bash, and WebFetch tools were all unavailable during this research session. All version numbers are sourced from training data (cutoff ~May 2025) and should be verified against npm before use. Version numbers are marked with confidence levels individually.

---

## Recommended Stack

### Monorepo Structure

This project has two distinct build targets (Figma plugin + MCP server) sharing types. Use a simple workspace-based monorepo, NOT a heavy tool like Nx or Turborepo -- the project is too small to justify them.

```
ai-ready-ds-auditor/
  packages/
    shared/          # Shared TypeScript types and constants
    figma-plugin/    # Figma plugin (Vite + React)
    mcp-server/      # MCP server (Node.js + TypeScript)
  package.json       # Workspace root
  tsconfig.base.json # Shared TS config
```

Use **npm workspaces** (built into npm 7+). No extra tooling needed.

---

### Core Technologies -- Figma Plugin

| Technology | Version | Confidence | Purpose | Why Recommended |
|------------|---------|------------|---------|-----------------|
| TypeScript | ^5.5 | LOW (verify) | Type safety | Strict mode required per project constraints; TS 5.5+ has improved inference and `isolatedDeclarations` |
| React | ^18.3 | LOW (verify: React 19 may be stable now) | Plugin UI framework | Project constraint. React 18 is stable; React 19 may be available -- verify before committing |
| Vite | ^6.0 | LOW (verify) | Plugin bundler | Project constraint. Fast HMR, excellent TS/React support, simpler config than webpack |
| @figma/plugin-typings | ^1.100 | LOW (verify) | Figma API type definitions | Official Figma package. Provides types for `figma.*` global API. Version updates frequently with API additions |

**Critical Figma Plugin Build Notes:**

Figma plugins have a unique build constraint: they produce TWO separate bundles:
1. **`code.js`** -- runs in Figma's main thread (sandbox, no DOM access, has `figma.*` API)
2. **`ui.html`** -- runs in an iframe (has DOM/React, communicates via `postMessage`)

Vite must be configured to produce both outputs. This is the single most important build configuration detail.

| Library | Version | Confidence | Purpose | When to Use |
|---------|---------|------------|---------|-------------|
| @create-figma-plugin/utilities | ^3.2 | LOW (verify) | Helper utilities for Figma plugin dev | Provides `emit`/`on` typed message passing between code.js and UI, useful abstractions over raw postMessage |
| @create-figma-plugin/ui | ^3.2 | LOW (verify) | Prebuilt Figma-style UI components | Optional -- provides Figma-native-looking UI components (buttons, inputs, dropdowns). Alternative: build your own with Figma's design specs |
| vite-plugin-singlefile | ^2.0 | LOW (verify) | Inlines all assets into single HTML file | Required for Figma plugin UI -- Figma loads UI from a single HTML string, cannot reference external assets |

---

### Core Technologies -- MCP Server

| Technology | Version | Confidence | Purpose | Why Recommended |
|------------|---------|------------|---------|-----------------|
| @modelcontextprotocol/sdk | ^1.5 | LOW (verify -- was evolving rapidly) | MCP protocol implementation | Official SDK from Anthropic/MCP org. Provides `Server`, `StdioServerTransport`, tool registration. This is the only serious option |
| zod | ^3.23 | LOW (verify) | Schema validation + MCP tool input schemas | MCP SDK uses zod schemas to define tool inputs. Not optional -- it is a peer dependency of the SDK |
| Node.js | >=20.0 (LTS) | MEDIUM | Runtime | Node 20 LTS is minimum for stable ES module support and fetch API. Node 22 LTS likely available -- verify |

| Library | Version | Confidence | Purpose | When to Use |
|---------|---------|------------|---------|-------------|
| zod-to-json-schema | ^3.23 | LOW (verify) | Convert zod schemas to JSON Schema | May be needed if MCP SDK does not handle this internally. Check SDK docs first -- it may be built in |
| tsx | ^4.19 | LOW (verify) | TypeScript execution without precompilation | For running MCP server in development without build step. `tsx watch` for dev mode |
| node-fetch | NOT NEEDED | HIGH | HTTP client | Node 20+ has built-in `fetch`. Do NOT install node-fetch |

---

### Shared Package

| Technology | Version | Confidence | Purpose | Why Recommended |
|------------|---------|------------|---------|-----------------|
| TypeScript | ^5.5 | LOW (verify) | Shared type definitions | Same version as plugin. Shared types for the JSON schema injected by plugin and read by MCP server |

The `shared` package defines:
- `AuditResult` type (the JSON schema stored via `setPluginData`)
- `ComponentSpec`, `DesignToken`, `AuditIssue` types
- Chunking constants (`CHUNK_SIZE_THRESHOLD = 95_000`, key prefix pattern)
- CSS framework enum

---

### Development Tools

| Tool | Version | Confidence | Purpose | Notes |
|------|---------|------------|---------|-------|
| ESLint | ^9.0 | LOW (verify) | Linting | ESLint 9 uses flat config (`eslint.config.js`). Do NOT use `.eslintrc.*` -- that is the legacy format |
| @typescript-eslint/eslint-plugin | ^8.0 | LOW (verify) | TypeScript-specific lint rules | Pair with @typescript-eslint/parser. Use `strict-type-checked` config for maximum safety |
| Prettier | ^3.3 | LOW (verify) | Code formatting | Use `prettier-plugin-organize-imports` to auto-sort imports |
| vitest | ^2.0 | LOW (verify) | Testing | Same Vite-based toolchain. Fast, native TypeScript support, compatible with Jest API |
| rimraf | ^6.0 | LOW (verify) | Cross-platform clean scripts | For `clean` npm script. Works on Windows (project is on Windows) |

### TypeScript Configuration

```jsonc
// tsconfig.base.json (workspace root)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

**Why these flags:**
- `strict: true` -- Project requirement. Enables all strict checks
- `noUncheckedIndexedAccess` -- Critical for Figma API responses where properties may be missing
- `exactOptionalPropertyTypes` -- Prevents `undefined` being assigned to optional properties accidentally
- `verbatimModuleSyntax` -- Enforces explicit `type` imports, cleaner tree-shaking
- `moduleResolution: "bundler"` -- Correct for Vite-based projects (not "node" or "node16")

**Plugin-specific tsconfig extends base with:**
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["@figma/plugin-typings"]
    // NOTE: @figma/plugin-typings declares global `figma` variable
    // The code.ts file needs DOM types EXCLUDED (no DOM in sandbox)
    // The ui.tsx file needs DOM types INCLUDED
    // You will need TWO tsconfigs in the plugin package:
    //   tsconfig.code.json (no DOM, has figma typings)
    //   tsconfig.ui.json (has DOM, has React, no figma typings)
  }
}
```

**MCP Server tsconfig extends base with:**
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

---

## ESLint Flat Config

```javascript
// eslint.config.js (workspace root)
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';

export default tseslint.config(
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React rules for plugin UI files only
  {
    files: ['packages/figma-plugin/src/ui/**/*.tsx'],
    ...pluginReact.configs.flat.recommended,
    ...pluginReact.configs.flat['jsx-runtime'],
  },
);
```

---

## Installation

```bash
# Initialize workspace root
npm init -y
# Set up workspaces in root package.json: "workspaces": ["packages/*"]

# === Figma Plugin ===
cd packages/figma-plugin

# Core
npm install react react-dom

# Dev
npm install -D typescript vite @vitejs/plugin-react \
  @figma/plugin-typings \
  @create-figma-plugin/utilities \
  vite-plugin-singlefile \
  @types/react @types/react-dom

# === MCP Server ===
cd packages/mcp-server

# Core
npm install @modelcontextprotocol/sdk zod

# Dev
npm install -D typescript tsx @types/node

# === Shared ===
cd packages/shared
npm install -D typescript

# === Root Dev Dependencies ===
cd ../..
npm install -D eslint @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser typescript-eslint \
  prettier eslint-plugin-react \
  vitest rimraf
```

**Note:** Run `npm view <pkg> version` for each package before installing to get current versions. The versions in this document are from training data and may be stale.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| npm workspaces | pnpm workspaces | If you prefer pnpm's stricter dependency hoisting. Either works fine for this project size |
| npm workspaces | Turborepo/Nx | NEVER for this project -- massive overkill for 3 packages. Adds config complexity with zero benefit |
| Vite | esbuild directly | Only if Vite's config proves problematic for the dual-output Figma build. esbuild is lower-level but gives more control |
| Vite | webpack | NEVER -- webpack is slower, more complex config, no advantage for this use case |
| @create-figma-plugin/utilities | Raw postMessage | If you want zero dependencies in the plugin sandbox code. The raw API is fine but requires manual type-safe message wrappers |
| @create-figma-plugin/ui | Custom React components | If you want full design control. The built-in components look native but limit customization |
| vitest | jest | Only if team is deeply invested in Jest. Vitest is faster and native to Vite projects |
| tsx | ts-node | NEVER -- ts-node has ESM compatibility issues. tsx just works |
| ESLint flat config | Legacy .eslintrc | NEVER -- ESLint 9 defaults to flat config. Legacy format is deprecated |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| webpack | Slower, more complex config, no HMR advantages over Vite for this use case | Vite |
| ts-node | Notorious ESM compatibility issues, slow startup | tsx |
| node-fetch | Unnecessary -- Node 20+ has native fetch | Built-in `globalThis.fetch` |
| .eslintrc (legacy config) | Deprecated in ESLint 9. Will be removed in future versions | eslint.config.js (flat config) |
| Create React App | Dead project, not maintained | Vite |
| Figma Plugin DS (figma-plugin-ds) | Unmaintained community package, not official | @create-figma-plugin/ui or custom components |
| express/fastify for MCP server | MCP servers communicate over stdio, not HTTP. Adding a web server is wrong architecture | @modelcontextprotocol/sdk with StdioServerTransport |
| Jest | Requires separate TS transform config, slower than vitest, does not integrate with Vite | vitest |
| Rollup directly | Vite uses Rollup under the hood. Going direct adds complexity without benefit | Vite |

---

## Stack Patterns by Variant

**For MCP Server transport:**
- Use `StdioServerTransport` because the server runs locally and IDEs (Cursor, Trae) connect via stdio
- Do NOT use SSE or HTTP transport -- those are for remote/cloud MCP servers
- The server is launched as a child process by the IDE, communicating over stdin/stdout

**For Figma Plugin UI framework:**
- Use React because it is a project constraint and matches ecosystem maturity
- The alternative (Preact) saves ~30kB but loses React DevTools and some library compatibility
- For a production plugin aimed at Figma Community, React's ecosystem advantage outweighs bundle size

**For Plugin sandbox code (code.ts):**
- Write in pure TypeScript, NO React, NO DOM APIs
- This runs in Figma's sandbox with access to `figma.*` API only
- Keep this lean -- it's the performance-critical path for scanning

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @modelcontextprotocol/sdk | zod ^3.22+ | SDK depends on zod for tool input schema definitions. Must use compatible zod version |
| Vite ^6 | @vitejs/plugin-react ^4 | Vite 6 requires plugin-react v4+. Do not use plugin-react v3 with Vite 6 |
| TypeScript ^5.5 | @typescript-eslint ^8 | typescript-eslint v8 supports TS 5.5+. Earlier versions may not |
| @figma/plugin-typings | Figma Plugin API | Typings version should match the minimum Figma API version you target. Newer typings add newer API types |
| React ^18 | @types/react ^18 | Keep React and its type definitions on the same major version |
| ESLint ^9 | typescript-eslint ^8 | typescript-eslint v8 supports ESLint 9 flat config natively |

---

## MCP Server Specific: Tool Registration Pattern

The MCP SDK uses a declarative pattern for registering tools. Here is the canonical shape:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ai-ready-ds-auditor",
  version: "1.0.0",
});

server.tool(
  "get_design_tokens",
  "Returns color, typography, and spacing tokens from the design system",
  {
    fileKey: z.string().describe("Figma file key"),
    tokenType: z.enum(["color", "typography", "spacing", "all"]).optional(),
  },
  async ({ fileKey, tokenType }) => {
    // Implementation here
    return {
      content: [{ type: "text", text: JSON.stringify(tokens) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Confidence: LOW** -- This API shape is from training data. The MCP SDK was evolving rapidly. Verify against current SDK docs before implementation.

---

## Figma Plugin Specific: Vite Config Pattern

```typescript
// vite.config.ts for the plugin
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// UI build -- produces ui.html with all JS/CSS inlined
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "src/ui/index.html",
      output: {
        entryFileNames: "ui.js",
      },
    },
    // Figma requires everything inlined
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // Inline everything
  },
});
```

For the sandbox code (`code.ts`), you need a SEPARATE build config or a Vite plugin that handles dual builds. Options:
1. Two Vite configs (`vite.config.ui.ts` and `vite.config.code.ts`) with npm scripts running both
2. A custom Vite plugin that builds `code.ts` as a secondary entry

**Confidence: MEDIUM** -- The dual-build pattern is well-established for Figma plugins. The specific Vite config syntax should be verified.

---

## Sources

- Training data (Claude, cutoff ~May 2025) -- ALL version numbers. Confidence: LOW
- Figma Plugin API documentation pattern (well-established, stable) -- Confidence: MEDIUM
- MCP Protocol specification and SDK patterns -- Confidence: LOW (SDK was rapidly evolving in early 2025)
- Vite documentation patterns -- Confidence: MEDIUM (core API is stable)
- TypeScript compiler options -- Confidence: HIGH (these flags are stable and well-documented)

---

## Action Items Before Implementation

1. **VERIFY ALL VERSIONS**: Run `npm view <package> version` for every package listed above
2. **Check MCP SDK API**: The SDK's tool registration API may have changed. Read the README at https://github.com/modelcontextprotocol/typescript-sdk
3. **Check React 19 status**: React 19 may be stable. If so, use it instead of React 18
4. **Check Vite 6 vs 7**: Vite 7 may exist by now. Check https://vitejs.dev
5. **Check @create-figma-plugin/utilities**: Verify it is still maintained and compatible with current Figma API
6. **Check ESLint 9 vs 10**: ESLint may have released v10. Verify flat config syntax

---
*Stack research for: Figma Plugin + MCP Server DesignOps Tool*
*Researched: 2026-03-02*
*Confidence caveat: All versions are from training data (May 2025 cutoff). Verify before use.*
