# Phase 1: Foundation - Research

**Researched:** 2026-03-03
**Domain:** npm workspaces monorepo, TypeScript project references, Vite dual-build, Figma plugin scaffold, typed message protocol
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Workspace structure**
- Root: npm workspaces monorepo (not pnpm, not Turborepo — keep it simple)
- Three packages: `packages/shared`, `packages/plugin`, `packages/mcp-server`
- Root-level `tsconfig.base.json` extended by each package
- TypeScript project references: both `plugin` and `mcp-server` reference `shared`
- Root-level scripts: `build`, `dev`, `lint`, `type-check`, `test` — all delegate to workspaces

**Shared types schema**
- `AuditReport` shape: `{ schemaVersion, fileId, fileName, scannedAt, summary, issues, components, tokens }`
- `issues` is a flat array of `AuditIssue` (not nested by category) — category is a field on each issue
- `AuditIssue` shape: `{ id, nodeId, nodeName, pageName, category, issueType, offendingValue, suggestedFix }`
- `DesignToken` shape: `{ id, name, type, value, rawValue, variableName?, collectionName?, groupPath[] }`
- `ComponentSpec` shape: `{ id, name, key, description, variants[], props[], usageCount }`
- `AuditMeta` (stored in `ai_data_meta`): `{ schemaVersion, chunkCount, totalBytes, fileId, fileName, scannedAt, checksum }`
- `schemaVersion` is a string constant (e.g., `"1.0.0"`) exported from shared package
- Chunking constants: `CHUNK_KEY_PREFIX = "ai_data_"`, `META_KEY = "ai_data_meta"`, `MAX_CHUNK_BYTES = 90_000`

**Message protocol**
- Discriminated union pattern: all messages have a `type` field (string literal)
- Fire-and-forget for most messages — no correlation IDs needed at this stage
- Exception: scan uses streaming — UI sends `START_SCAN`, sandbox sends multiple `SCAN_PROGRESS`, then `SCAN_COMPLETE` or `SCAN_ERROR`
- UI → Sandbox: `START_SCAN`, `INJECT_DATA`, `SELECT_NODE`
- Sandbox → UI: `SCAN_PROGRESS`, `SCAN_COMPLETE`, `SCAN_ERROR`, `INJECT_COMPLETE`, `INJECT_ERROR`, `SYNC_OUTDATED`
- Types live in `packages/shared/src/messages.ts`

**TypeScript configuration**
- `strict: true` across all packages — non-negotiable
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`
- `@figma/plugin-typings` applied only to `packages/plugin` sandbox code (not the UI)
- ESLint rule `no-console` set to `error` in `packages/mcp-server`
- Prettier: single quotes, 2-space indent, trailing commas ES5, 100-char print width

**Vite dual-build**
- Plugin package has two Vite configs (or one config with multiple entries):
  - Entry 1: `src/sandbox/code.ts` → `dist/code.js` (IIFE or CJS, no DOM types)
  - Entry 2: `src/ui/index.tsx` → `dist/ui.html` (inlined via `vite-plugin-singlefile`)
- `dist/manifest.json` is the Figma plugin entry point (copied from source)
- `npm run dev` in plugin package: Vite watch mode for both entries simultaneously
- `npm run build` in plugin package: production builds of both entries

**Dev workflow**
- Developer loads plugin in Figma via "Plugins → Development → Import plugin from manifest" pointing to `packages/plugin/dist/manifest.json`
- Vite watch mode rebuilds on save; developer manually refreshes plugin in Figma (no HMR in sandbox)
- UI hot reload IS possible within the iframe via Vite's HMR during development
- MCP server dev: `npm run dev` uses `tsx watch` for live reload

### Claude's Discretion

- Exact `manifest.json` permissions (editorType, network access) — Claude determines based on Figma plugin API requirements
- Specific ESLint rules beyond the no-console ban — Claude chooses a reasonable TypeScript-eslint ruleset
- Prettier config details — Claude uses the decisions above and fills in reasonable defaults
- `vitest` workspace config — Claude sets up test runner for all packages

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | npm workspaces monorepo with three packages | npm workspaces `workspaces` field + `packages/*` glob; `tsc --build` for topological order |
| INFRA-02 | Shared types package exports AuditReport, AuditMeta, DesignToken, ComponentSpec, chunking constants, schemaVersion | TypeScript `composite: true` + `declaration: true` pattern; explicit exports in package.json |
| INFRA-03 | TypeScript strict mode across all packages | Base tsconfig with strict flags; each package extends base |
| INFRA-04 | TypeScript project references configured | `composite: true` in shared; `references` array in plugin and mcp-server tsconfigs |
| INFRA-05 | ESLint with TypeScript rules + no-console ban in mcp-server | typescript-eslint v8 flat config; per-package eslint.config.ts files |
| INFRA-06 | Prettier configured consistently | Root `.prettierrc` with shared config; single quotes, 2-space, trailing commas ES5 |
| INFRA-07 | Root npm scripts: dev, build, lint, type-check, test | `npm run X --workspaces --if-present` pattern + TypeScript `tsc --build` for type-check |
| PLUG-01 | Vite dual-build: code.js (sandbox) + ui.html (single-file inlined iframe) | Two separate vite configs; IIFE format for sandbox, viteSingleFile for UI |
| PLUG-02 | vite-plugin-singlefile inlines all UI assets into single ui.html | `vite-plugin-singlefile` v2.3.0 with `viteSingleFile()` plugin |
| PLUG-03 | @figma/plugin-typings installed and applied to sandbox code.ts | Separate tsconfig for sandbox with `typeRoots` pointing to `@figma`; `lib: ["es2017"]` not DOM |
| PLUG-04 | Typed message protocol via shared discriminated union types | Discriminated union with `type` literal field; shared `messages.ts`; UI wraps in `pluginMessage` |
| PLUG-05 | manifest.json with correct permissions, name, entry points | `editorType: ["figma"]`, `main: "code.js"`, `ui: "ui.html"`, `documentAccess: "dynamic-page"` |
| PLUG-06 | Hot-reload dev workflow (npm run dev in plugin package) | Vite watch mode for both configs in parallel; `tsx watch` for mcp-server |
</phase_requirements>

---

## Summary

Phase 1 is a pure scaffolding and tooling phase with no audit business logic. The core challenge is wiring up four distinct systems that must cooperate: (1) an npm workspaces monorepo where `shared` is built before `plugin` and `mcp-server` can type-check, (2) a dual-build Vite setup that produces both a bundled IIFE (`code.js`) and a self-contained HTML file (`ui.html`) from one package, (3) the Figma plugin sandbox/UI message boundary which requires careful TypeScript separation between DOM and non-DOM environments, and (4) a strict TypeScript configuration that catches real bugs from day one.

The most critical insight from research: npm workspaces does NOT run scripts in topological order. Running `npm run build --workspaces` will fail intermittently because `plugin` and `mcp-server` may attempt to build before `shared` produces its `.d.ts` declarations. The solution is to use `tsc --build` (TypeScript project references) for type checking (which DOES respect topological order) and to write root build scripts that sequence `shared` first explicitly. For Vite builds inside the plugin package, Vite resolves `shared` through workspace symlinks.

The Figma sandbox TypeScript configuration is a known source of confusion. The sandbox (`code.ts`) must use `lib: ["es2017"]` (no DOM) and `typeRoots` pointing to `@figma/plugin-typings`. The UI (`index.tsx`) uses standard DOM lib and React JSX. These two environments must have separate `tsconfig.json` files inside `packages/plugin`.

**Primary recommendation:** Set up two Vite configs in `packages/plugin` (one for sandbox IIFE, one for UI singlefile), use TypeScript project references with `tsc --build` at the root for type-check ordering, and write root scripts that explicitly build `shared` before the other packages.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Language for all packages | Strict mode + project references for monorepo |
| Vite | 7.3.1 | Bundler for plugin package | Fast HMR for UI; library mode for sandbox |
| vite-plugin-singlefile | 2.3.0 | Inline all UI assets into ui.html | Figma requires single-file HTML; this handles CSS, JS, fonts |
| @figma/plugin-typings | 1.123.0 | Figma API type definitions for sandbox | Official typings from Figma; sandbox-specific (no DOM) |
| @vitejs/plugin-react | 5.1.4 | React JSX transform in Vite | Standard Vite+React integration |
| eslint | 10.0.2 | Linting across all packages | Required for no-console ban in mcp-server |
| @typescript-eslint/eslint-plugin | 8.56.1 | TypeScript-aware lint rules | typescript-eslint v8 is the current standard |
| prettier | 3.8.1 | Code formatting | Enforces consistent style; 100-char width |
| tsx | 4.21.0 | TypeScript execution + watch for mcp-server | Zero-config TS runner; `tsx watch` for dev |
| vitest | 4.0.18 | Test runner for all packages | Vite-native; reuses Vite config; supports monorepo projects |
| react | 19.2.4 | UI framework for plugin UI | Plugin UI decision |
| @types/react | 19.2.14 | React type definitions | Pairs with react |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-config-prettier | 10.1.8 | Disable ESLint rules that conflict with Prettier | Always use alongside Prettier |
| npm-run-all2 | (latest) | Run npm scripts in parallel or sequence | Useful for `dev` script running both Vite configs in parallel |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| npm workspaces | pnpm/Turborepo | User explicitly decided against; npm workspaces is simpler for 3 packages |
| Two separate vite.config files | Single config with rollupOptions.input | Two configs is cleaner: different plugins per entry (singlefile only for UI) |
| tsx watch | nodemon + ts-node | tsx is simpler, faster cold starts, no tsconfig ceremony |
| vitest | jest | Vitest reuses Vite config, zero extra setup for Vite projects |

**Installation (root):**
```bash
npm install --save-dev typescript prettier eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier vitest
```

**Installation (packages/plugin):**
```bash
npm install --save-dev vite @vitejs/plugin-react vite-plugin-singlefile @figma/plugin-typings react react-dom @types/react @types/react-dom
```

**Installation (packages/mcp-server):**
```bash
npm install --save-dev tsx
```

## Architecture Patterns

### Recommended Project Structure
```
ai-ready-ds-auditor/
├── package.json                   # workspaces: ["packages/*"]
├── tsconfig.base.json             # shared strict settings, no includes
├── tsconfig.json                  # root tsc --build references all packages
├── eslint.config.ts               # root flat config (shared base)
├── .prettierrc                    # single source of truth for formatting
├── .gitignore                     # covers all packages
├── packages/
│   ├── shared/
│   │   ├── package.json           # name: "@ai-ds-auditor/shared"
│   │   ├── tsconfig.json          # extends base, composite: true, declaration: true
│   │   └── src/
│   │       ├── index.ts           # barrel export (schemaVersion first)
│   │       ├── types.ts           # AuditReport, AuditIssue, DesignToken, ComponentSpec, AuditMeta
│   │       ├── messages.ts        # PluginMessage, UIMessage discriminated unions
│   │       └── constants.ts       # CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES
│   ├── plugin/
│   │   ├── package.json           # name: "@ai-ds-auditor/plugin"
│   │   ├── manifest.json          # SOURCE manifest (copied to dist/)
│   │   ├── vite.config.sandbox.ts # Builds code.js (IIFE, no DOM)
│   │   ├── vite.config.ui.ts      # Builds ui.html (singlefile + React)
│   │   ├── tsconfig.json          # extends base, no composite needed
│   │   ├── tsconfig.sandbox.json  # extends tsconfig.json, lib: [es2017], typeRoots: [@figma]
│   │   └── src/
│   │       ├── sandbox/
│   │       │   └── code.ts        # Figma sandbox entry point
│   │       └── ui/
│   │           ├── index.tsx      # React UI entry point
│   │           └── index.html     # Vite HTML template
│   └── mcp-server/
│       ├── package.json           # name: "@ai-ds-auditor/mcp-server"
│       ├── tsconfig.json          # extends base, references shared
│       └── src/
│           └── index.ts           # MCP server entry (stub for Phase 1)
```

### Pattern 1: TypeScript Project References with tsc --build

**What:** Root `tsconfig.json` lists all packages as `references`. `tsc --build` computes topological order and builds `shared` before `plugin` and `mcp-server`.
**When to use:** Type-checking step at root. NOT used for Vite builds (Vite resolves through workspace symlinks).

```json
// tsconfig.base.json — strict settings, no files/includes
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

```json
// tsconfig.json — root build orchestrator
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
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

```json
// packages/plugin/tsconfig.json — references shared; NOT composite (Vite handles bundling)
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src/**/*"]
}
```

```json
// packages/plugin/tsconfig.sandbox.json — sandbox-specific: NO DOM, Figma types
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2017"],
    "typeRoots": [
      "../../node_modules/@types",
      "../../node_modules/@figma"
    ],
    "jsx": "preserve"
  },
  "include": ["src/sandbox/**/*"]
}
```

### Pattern 2: Vite Dual-Build for Figma Plugin

**What:** Two separate Vite config files in `packages/plugin`. Sandbox uses library mode with IIFE output; UI uses standard app mode with `vite-plugin-singlefile`.
**When to use:** This is the only viable approach — a single config cannot use `viteSingleFile()` (which expects an HTML entry) and IIFE library mode simultaneously.

```typescript
// packages/plugin/vite.config.sandbox.ts
// Source: iGoodie/figma-plugin-react-vite boilerplate pattern
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    emptyOutDir: false,          // Don't wipe dist/ — ui build runs separately
    outDir: 'dist',
    lib: {
      entry: path.resolve('src/sandbox/code.ts'),
      name: 'code',
      fileName: () => 'code.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,  // Required: Figma loads a single JS file
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve('../shared/src'),
    },
  },
});
```

```typescript
// packages/plugin/vite.config.ui.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve('src/ui/index.html'),
      output: {
        entryFileNames: 'ui.html',
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve('../shared/src'),
    },
  },
});
```

```json
// packages/plugin/package.json scripts
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:sandbox dev:ui",
    "dev:sandbox": "vite build --watch --config vite.config.sandbox.ts",
    "dev:ui": "vite build --watch --config vite.config.ui.ts",
    "build": "npm-run-all build:sandbox build:ui",
    "build:sandbox": "vite build --config vite.config.sandbox.ts",
    "build:ui": "vite build --config vite.config.ui.ts"
  }
}
```

### Pattern 3: Typed Message Protocol (Discriminated Union)

**What:** All messages between sandbox and UI are typed via discriminated unions exported from `packages/shared`. Sandbox side uses `figma.ui.postMessage()`; UI side wraps in `{ pluginMessage: ... }` for `parent.postMessage()`.
**When to use:** Every message crossing the sandbox/iframe boundary.

```typescript
// Source: Figma official plugin API docs (developers.figma.com)
// packages/shared/src/messages.ts

// Messages FROM sandbox TO UI
export type SandboxMessage =
  | { type: 'SCAN_PROGRESS'; percent: number; currentNode: string }
  | { type: 'SCAN_COMPLETE'; report: AuditReport }
  | { type: 'SCAN_ERROR'; message: string }
  | { type: 'INJECT_COMPLETE'; bytesWritten: number; chunkCount: number }
  | { type: 'INJECT_ERROR'; message: string }
  | { type: 'SYNC_OUTDATED'; lastScannedAt: string };

// Messages FROM UI TO sandbox
export type UIMessage =
  | { type: 'START_SCAN' }
  | { type: 'INJECT_DATA' }
  | { type: 'SELECT_NODE'; nodeId: string };
```

```typescript
// packages/plugin/src/sandbox/code.ts — sending a message to UI
// Source: developers.figma.com/docs/plugins/creating-ui/
const msg: SandboxMessage = { type: 'SCAN_PROGRESS', percent: 50, currentNode: 'Button' };
figma.ui.postMessage(msg);

// Receiving from UI
figma.ui.onmessage = (raw: unknown) => {
  const msg = raw as UIMessage;  // trust boundary — validate in later phases
  switch (msg.type) {
    case 'START_SCAN':
      // ...
      break;
  }
};
```

```typescript
// packages/plugin/src/ui/index.tsx — sending to sandbox
// Source: developers.figma.com/docs/plugins/creating-ui/
const msg: UIMessage = { type: 'START_SCAN' };
parent.postMessage({ pluginMessage: msg }, '*');

// Receiving from sandbox
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as SandboxMessage;
  switch (msg.type) {
    case 'SCAN_COMPLETE':
      // ...
      break;
  }
};
```

### Pattern 4: Figma manifest.json

**What:** The manifest lives at `packages/plugin/manifest.json` and is copied to `dist/` by Vite's `public` folder or a copy plugin. Figma loads from `dist/manifest.json`.

```json
// packages/plugin/manifest.json
{
  "name": "AI-Ready DS Auditor",
  "id": "",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}
```

Notes on manifest fields (verified via developers.figma.com/docs/plugins/manifest/):
- `id` is blank for development; Figma assigns one on publish
- `documentAccess: "dynamic-page"` is REQUIRED for new plugins (allows traversing all pages)
- `networkAccess.allowedDomains: ["none"]` — Phase 1 plugin makes no network calls; safe restrictive default
- `editorType: ["figma"]` — Figma design editor only (not FigJam, not Dev Mode)
- No `permissions` array needed for Phase 1 (no teamlibrary, no payments, no currentuser needed)

### Pattern 5: Root Scripts Delegation

**What:** Root `package.json` scripts delegate to workspaces, with special handling for `type-check` (uses `tsc --build`) and `build` (sequences `shared` first).

```json
// root package.json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build -w packages/shared && npm run build --workspaces --if-present",
    "dev": "npm run dev --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "type-check": "tsc --build",
    "test": "vitest run"
  }
}
```

Critical: The `build` script runs `packages/shared` first explicitly, then all packages. Without this, `plugin` and `mcp-server` will fail because `shared/dist/*.d.ts` won't exist yet.

### Pattern 6: ESLint Flat Config

**What:** ESLint v10 with typescript-eslint v8 uses flat config (`eslint.config.ts`). One root config provides the base; `mcp-server` adds `no-console: error`.

```typescript
// root eslint.config.ts
// Source: typescript-eslint.io/getting-started
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },
);
```

```typescript
// packages/mcp-server/eslint.config.ts — adds no-console ban
import rootConfig from '../../eslint.config.ts';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...rootConfig,
  {
    rules: {
      'no-console': 'error',   // CRITICAL: stdio transport corrupted by stdout
    },
  },
);
```

### Anti-Patterns to Avoid

- **Using `npm run build --workspaces` without ordering:** npm workspaces runs scripts alphabetically, not topologically. `mcp-server` and `plugin` build before `shared`, causing type errors on `.d.ts` imports.
- **Putting DOM lib in sandbox tsconfig:** Adding `"lib": ["DOM"]` or relying on `tsconfig.base.json` defaults in the sandbox tsconfig will conflict with `@figma/plugin-typings`'s console definition.
- **Using `composite: true` in plugin tsconfig:** Figma plugin's `packages/plugin` is not a TypeScript library — Vite handles its output. Adding `composite` there forces `.tsbuildinfo` and `outDir` constraints that conflict with Vite's output.
- **Single Vite config for both entries:** `vite-plugin-singlefile` expects an HTML entry. The sandbox entry is a TS file producing IIFE. These require different Vite modes and cannot share a config cleanly.
- **console.log in mcp-server:** Any stdout output from mcp-server corrupts the stdio transport that Claude/Cursor/Trae reads. Use `console.error()` (writes to stderr) for all diagnostic output.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inlining CSS/JS into HTML | Custom script to `<script>`-inject build output | `vite-plugin-singlefile` | Handles base64 assets, CSS inlining, font inlining, script injection — many edge cases |
| TypeScript execution in Node dev | Custom ts-then-node pipeline | `tsx watch` | Zero config, esbuild-fast, handles ESM/CJS transparently |
| Build ordering in monorepo | Shell scripts with manual sequencing | `tsc --build` (type-check) + explicit workspace `-w` flag (Vite) | tsc --build is the authoritative topological solver for TypeScript projects |
| ESLint TypeScript integration | Custom rules or eslint-plugin-typescript (old) | `typescript-eslint` v8 | v8 uses the new "project service" — the same TypeScript compiler as VS Code |
| Parallel script running | Background processes with `&` | `npm-run-all2` (--parallel) | Cross-platform, clean exit on failure, named output |

**Key insight:** Figma plugins have a very unusual build constraint (single HTML file, no external resources, no ESM dynamic imports). Every "obvious" Vite setup fails for one of these reasons. The `vite-plugin-singlefile` + IIFE combination is the established community solution — do not attempt to replicate it.

## Common Pitfalls

### Pitfall 1: npm workspaces build ordering failure
**What goes wrong:** `npm run build --workspaces` builds packages in an undefined order. When `plugin` or `mcp-server` runs before `shared`, their TypeScript imports fail because `shared/dist/` doesn't exist.
**Why it happens:** npm workspaces does NOT topologically sort scripts — it's a known limitation (GitHub issue #4139 against npm/cli, still open).
**How to avoid:** Root build script MUST explicitly run `shared` first: `"build": "npm run build -w packages/shared && npm run build --workspaces --if-present"`. For type-check, use `tsc --build` which DOES topological sort.
**Warning signs:** `Cannot find module '@ai-ds-auditor/shared'` errors in plugin or mcp-server during build.

### Pitfall 2: Sandbox TypeScript gets DOM types
**What goes wrong:** The sandbox (`code.ts`) sees DOM globals (`Window`, `document`, `console`) which conflict with Figma's typings. TypeScript errors on `console.log` (Figma's console has a different signature).
**Why it happens:** When `tsconfig.sandbox.json` extends a base that includes `"lib": ["ES2022", "DOM"]`, DOM types leak in.
**How to avoid:** `tsconfig.sandbox.json` must explicitly set `"lib": ["ES2017"]` (no DOM) and `"typeRoots"` pointing only to `@figma`. Do NOT set `typeRoots` in `tsconfig.base.json`.
**Warning signs:** TS error: `Duplicate identifier 'console'` or `Type 'Console' is not assignable to type 'Console'`.

### Pitfall 3: Vite IIFE format with code splitting
**What goes wrong:** Using `import()` (dynamic imports) in the sandbox code causes Vite/Rollup to fail with "UMD and IIFE output formats are not supported for code-splitting builds."
**Why it happens:** IIFE requires all code in one file; dynamic imports require multiple output chunks.
**How to avoid:** Set `inlineDynamicImports: true` in the sandbox Vite config's rollup output options. Keep all sandbox code as static imports.
**Warning signs:** Rollup error during `vite build --config vite.config.sandbox.ts`.

### Pitfall 4: postMessage type safety break
**What goes wrong:** The UI receives `event.data.pluginMessage` typed as `any`. Casting to a union type without a guard compiles but throws at runtime on unexpected message shapes.
**Why it happens:** Figma's postMessage boundary is not type-safe at runtime; TypeScript types are erased. In Phase 1 a simple cast is acceptable (no external inputs), but the pattern must be noted.
**How to avoid:** In Phase 1, cast explicitly with a comment. From Phase 2 onward, add a type guard or discriminated union narrowing function that validates the `type` field before switching.
**Warning signs:** Runtime error `Cannot read property 'X' of undefined` on `msg.someField`.

### Pitfall 5: `exactOptionalPropertyTypes` breaks common patterns
**What goes wrong:** With `exactOptionalPropertyTypes: true`, passing `{ foo: undefined }` where `{ foo?: string }` is expected fails. This is stricter than normal TypeScript's optional handling.
**Why it happens:** This flag distinguishes `key?: string` (property absent) from `key: string | undefined` (property present with undefined value). Common patterns like `{ ...defaults, optionalProp: maybeUndefined }` break.
**How to avoid:** Be explicit in type definitions. Use `key?: string` (not `key: string | undefined`) for truly optional properties. When spreading, filter out undefined values.
**Warning signs:** TS error: `Type '{ foo: undefined }' is not assignable to type '{ foo?: string }'`.

### Pitfall 6: vite-plugin-singlefile and large assets
**What goes wrong:** Large images or fonts in the UI bundle inflate `ui.html` dramatically. The target is <200kB gzipped for the final product.
**Why it happens:** vite-plugin-singlefile inlines ALL assets as base64. Fonts especially add hundreds of KB.
**How to avoid:** In Phase 1, the UI is a stub — no real assets. Document this for Phase 3 (Plugin UI phase): avoid bundling fonts; use system font stack; SVG icons only.
**Warning signs:** Build output shows `ui.html` > 500kB.

## Code Examples

### Shared Package barrel export (schemaVersion first)
```typescript
// Source: CONTEXT.md decision — schemaVersion is the forward-compatibility anchor
// packages/shared/src/index.ts
export const schemaVersion = '1.0.0';

export * from './types';
export * from './messages';
export * from './constants';
```

### Chunking constants
```typescript
// packages/shared/src/constants.ts
export const CHUNK_KEY_PREFIX = 'ai_data_' as const;
export const META_KEY = 'ai_data_meta' as const;
export const MAX_CHUNK_BYTES = 90_000 as const;
```

### AuditReport type definition
```typescript
// packages/shared/src/types.ts
export interface AuditIssue {
  id: string;
  nodeId: string;
  nodeName: string;
  pageName: string;
  category: 'color' | 'typography' | 'spacing' | 'component';
  issueType: string;
  offendingValue: string;
  suggestedFix: string;
}

export interface DesignToken {
  id: string;
  name: string;
  type: 'color' | 'typography' | 'spacing' | 'other';
  value: string;
  rawValue: string;
  variableName?: string;
  collectionName?: string;
  groupPath: string[];
}

export interface ComponentSpec {
  id: string;
  name: string;
  key: string;
  description: string;
  variants: string[];
  props: string[];
  usageCount: number;
}

export interface AuditMeta {
  schemaVersion: string;
  chunkCount: number;
  totalBytes: number;
  fileId: string;
  fileName: string;
  scannedAt: string;
  checksum: string;
}

export interface AuditReport {
  schemaVersion: string;
  fileId: string;
  fileName: string;
  scannedAt: string;
  summary: {
    totalIssues: number;
    totalTokens: number;
    totalComponents: number;
    issuesByCategory: Record<string, number>;
    healthScore: number;
  };
  issues: AuditIssue[];
  components: ComponentSpec[];
  tokens: DesignToken[];
}
```

### Round-trip message proof (Phase 1 success criterion)
```typescript
// packages/plugin/src/sandbox/code.ts — prove sandbox→UI→sandbox works
figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = (raw: unknown) => {
  const msg = raw as UIMessage;
  if (msg.type === 'START_SCAN') {
    // Echo back to prove round-trip
    const response: SandboxMessage = {
      type: 'SCAN_PROGRESS',
      percent: 0,
      currentNode: 'echo-test',
    };
    figma.ui.postMessage(response);
  }
};

// Send first message to UI immediately
const hello: SandboxMessage = {
  type: 'SYNC_OUTDATED',
  lastScannedAt: new Date().toISOString(),
};
figma.ui.postMessage(hello);
```

### tsx watch for mcp-server dev
```bash
# packages/mcp-server/package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "type-check": "tsc --noEmit"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint `.eslintrc.js` (legacy) | `eslint.config.ts` flat config | ESLint v9 / 2024 | Must use flat config; `@typescript-eslint/parser` set differently |
| `typescript-eslint` v7 | `typescript-eslint` v8 | Mid-2024 | v8 ships `projectService` (no `parserOptions.project` needed) |
| `vitest` workspaces config | `vitest` projects config | Vitest 3.2 / 2025 | `workspaces` key deprecated; use `test.projects` in root config |
| `ts-node` for Node.js TS dev | `tsx` | 2022-2024 | tsx is ~10x faster cold start; handles ESM without config ceremony |
| figma.com/plugin-docs | developers.figma.com/docs/plugins | 2024 | Old URLs 301-redirect; use new domain for canonical docs |

**Deprecated/outdated:**
- `@figma/plugin-typings` versions before 1.0.0: old semver scheme; current is 1.123.0
- ESLint `eslintignore` file: replaced by `ignores` array in flat config
- Vitest `workspace` file (vitest.workspace.ts): deprecated; use `test.projects` in `vitest.config.ts`

## Open Questions

1. **vite-plugin-singlefile compatibility with Vite 7**
   - What we know: vite-plugin-singlefile 2.3.0 is current; Vite 7.3.1 is current
   - What's unclear: Peer dependency range of vite-plugin-singlefile — could not verify against npm (403 on direct fetch). The npm `view` command confirmed 2.3.0 is current.
   - Recommendation: Run `npm install` and check for peer dep warnings on first scaffold. If incompatible, `@brrock/vite-plugin-singlefile` is a maintained fork.

2. **manifest.json `id` field for development**
   - What we know: Figma docs say `id` is assigned on publish; for dev plugins loaded locally, can be empty string or omitted.
   - What's unclear: Whether Figma Desktop throws errors on empty `id` when loading via Import Plugin from Manifest.
   - Recommendation: Use empty string `""` initially; Figma will prompt to generate one if needed.

3. **Vitest projects config with packages that have no vitest.config.ts**
   - What we know: Vitest 4.x projects config with `packages/*` glob works; projects without test files are silently skipped.
   - What's unclear: Whether shared package (compiled TypeScript, not Vite) needs a separate `vitest.config.ts` or can use default.
   - Recommendation: Start with root `vitest.config.ts` using `test.projects: ['packages/*']`; add per-package configs only when needed.

## Sources

### Primary (HIGH confidence)
- `developers.figma.com/docs/plugins/creating-ui/` — postMessage API, sandbox vs UI communication, supported message types
- `developers.figma.com/docs/plugins/manifest/` — manifest.json required fields, editorType, documentAccess, networkAccess, permissions
- `typescriptlang.org/docs/handbook/project-references.html` — composite builds, tsc --build topological order, incremental compilation
- `typescript-eslint.io/getting-started/` — flat config setup, recommended vs strict configs
- `tsx.is/watch-mode` — tsx watch command syntax and options
- `vitest.dev/guide/projects` — vitest projects config (replaces deprecated workspaces)
- `vite.dev/config/build-options` — lib mode, IIFE format, rollupOptions

### Secondary (MEDIUM confidence)
- `github.com/iGoodie/figma-plugin-react-vite` — Vite dual-config pattern for Figma (boilerplate; verified community-standard approach)
- `npm view` commands (run live) — confirmed all package versions on npm registry
- `github.com/npm/cli/issues/4139` — confirmed npm workspaces does NOT topological-sort scripts

### Tertiary (LOW confidence)
- macwright.com/2024/03/29/figma-plugins — pitfalls (single source, blog post, March 2024)
- WebSearch results on ESLint flat config patterns (multiple sources agree, not directly verified in official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view` live commands
- Architecture: HIGH — patterns verified against official Figma docs and TypeScript handbook
- Pitfalls: HIGH for sandbox/DOM and npm ordering (verified via official GitHub issues); MEDIUM for vite-plugin-singlefile + Vite 7 compatibility (could not verify peer deps directly)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable tooling; Figma API rarely breaks; vite-plugin-singlefile peer dep question should be resolved at install time)
