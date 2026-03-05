---
phase: 01-foundation
plan: 02
subsystem: plugin
tags: [vite, react, figma-plugin, typescript, vite-plugin-singlefile, iife, dual-build]

# Dependency graph
requires:
  - phase: 01-01
    provides: "npm workspaces monorepo, tsconfig.base.json, packages/shared types and message protocol"
provides:
  - "packages/plugin dual Vite build: sandbox IIFE (code.js) + single-file UI (ui.html)"
  - "Figma manifest with documentAccess=dynamic-page and networkAccess=none"
  - "tsconfig.sandbox.json: ES2017 lib only, @figma typeRoots, no DOM — prevents Duplicate identifier errors"
  - "React UI stub with exhaustive SandboxMessage handler"
  - "Sandbox code.ts stub with figma.showUI, onmessage dispatch, exhaustiveness check"
  - "npm-run-all2 parallel dev watch: dev:sandbox + dev:ui simultaneously"
affects: [03-audit-engine, 04-data-injection, 05-mcp-server, 06-integration]

# Tech tracking
tech-stack:
  added:
    - "vite@7.3.1 (plugin devDependency)"
    - "@vitejs/plugin-react@5.1.4"
    - "vite-plugin-singlefile@2.3.0 (standard package — no fork needed)"
    - "@figma/plugin-typings@^1.123.0"
    - "react@^19.2.4"
    - "react-dom@^19.2.4"
    - "@types/react@^19.2.14"
    - "@types/react-dom@^19.2.3"
    - "npm-run-all2@^8.0.4 (maintained fork of archived npm-run-all)"
  patterns:
    - "Dual Vite build: sandbox uses lib.entry+formats=['iife'], UI uses rollupOptions.input+viteSingleFile()"
    - "emptyOutDir: false on both builds — build:manifest creates dist/ first, sandbox and UI add to it"
    - "HTML template named ui.html (not index.html) — viteSingleFile preserves stem, so dist/ui.html matches manifest"
    - "vite.config.ui.ts sets root: src/ui so Vite resolves HTML-relative imports correctly"
    - "tsconfig.sandbox.json: typeRoots points only to node_modules/@figma (no @types) — prevents DOM type collisions"
    - "@shared alias: path.resolve to ../shared/src in both Vite configs; paths in both tsconfigs"
    - "tsconfig.json for UI: noEmit: true (Vite handles bundling), no outDir/rootDir"

key-files:
  created:
    - "packages/plugin/manifest.json"
    - "packages/plugin/tsconfig.sandbox.json"
    - "packages/plugin/vite.config.sandbox.ts"
    - "packages/plugin/vite.config.ui.ts"
    - "packages/plugin/src/sandbox/code.ts"
    - "packages/plugin/src/ui/ui.html"
    - "packages/plugin/src/ui/index.tsx"
    - "packages/plugin/src/ui/App.tsx"
  modified:
    - "packages/plugin/package.json"
    - "packages/plugin/tsconfig.json"
    - "package-lock.json"

key-decisions:
  - "Renamed HTML entry from index.html to ui.html — viteSingleFile preserves the filename stem, so dist/ui.html matches manifest's ui field without extra renaming config"
  - "Used npm-run-all2 (maintained fork) instead of npm-run-all (archived on npm) — identical API, drop-in replacement"
  - "vite-plugin-singlefile@2.3.0 installed without issues — no fork needed (RESEARCH.md open question resolved)"
  - "vite.config.ui.ts adds root: src/ui so Vite resolves the HTML file and script src='./index.tsx' relative to that directory"
  - "tsconfig.json for plugin UI uses noEmit: true — Vite owns the build output, tsc only type-checks"
  - "tsconfig.sandbox.json typeRoots: ['../../node_modules/@figma'] only — no @types — prevents TypeScript from loading DOM types that collide with Figma globals"

patterns-established:
  - "Figma manifest id: empty for dev, Figma assigns on publish"
  - "documentAccess: dynamic-page required for all new Figma plugins to traverse pages"
  - "networkAccess.allowedDomains: ['none'] safe default — no network calls in Phase 1"
  - "Exhaustiveness check pattern: default: { const _exhaustive: never = msg; void _exhaustive; } in both sandbox and UI message switches"
  - "@shared/* path alias in both Vite configs (resolve.alias) and tsconfigs (paths) — consistent resolution at build and type-check time"

requirements-completed: [PLUG-01, PLUG-02, PLUG-03, PLUG-05, PLUG-06]

# Metrics
duration: ~15min
completed: 2026-03-03
---

# Phase 1 Plan 02: Plugin Scaffold Summary

**Dual Vite build for Figma plugin: sandbox IIFE (0.47kB) and single-file React UI (194.64kB gzipped) with typed message protocol stubs and correct tsconfig isolation (ES2017-only sandbox, DOM UI)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-03T00:45:00Z
- **Completed:** 2026-03-03T00:50:00Z
- **Tasks:** 2
- **Files modified:** 11 (8 created, 3 modified)

## Accomplishments

- Dual Vite build producing `dist/code.js` (IIFE, 0.47kB) and `dist/ui.html` (single-file, 194.64kB / 61.39kB gzipped) — both verified correct format
- `tsconfig.sandbox.json` isolates sandbox from DOM types: `lib: ["ES2017"]` only, `typeRoots: ["../../node_modules/@figma"]` — prevents "Duplicate identifier" collisions
- Typed message stubs with exhaustiveness checks in both `code.ts` (sandbox) and `App.tsx` (UI) — all SandboxMessage and UIMessage variants handled
- `npm run build` at repo root exits 0 across all three packages; `npm run type-check` exits 0 with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Plugin package config, dual Vite build, tsconfigs, manifest** - `4f0779d` (chore)
2. **Task 2: Plugin sandbox stub and React UI stub** - `2624daa` (feat)

## Files Created/Modified

- `packages/plugin/package.json` — replaced stub: dev/build scripts using npm-run-all2, devDependencies added
- `packages/plugin/tsconfig.json` — updated: noEmit=true, DOM lib, react-jsx, @shared paths alias, removed composite
- `packages/plugin/tsconfig.sandbox.json` — new: ES2017 lib only, @figma typeRoots, @shared paths, no DOM
- `packages/plugin/vite.config.sandbox.ts` — new: IIFE lib build for sandbox entry (src/sandbox/code.ts)
- `packages/plugin/vite.config.ui.ts` — new: viteSingleFile build for UI (root: src/ui, input: ui.html)
- `packages/plugin/manifest.json` — new: Figma manifest (id empty, documentAccess=dynamic-page, networkAccess=none)
- `packages/plugin/src/sandbox/code.ts` — new: figma.showUI, onmessage handler, SYNC_OUTDATED init message
- `packages/plugin/src/ui/ui.html` — new: Vite HTML template (named ui.html to match manifest)
- `packages/plugin/src/ui/index.tsx` — new: React root (createRoot + StrictMode)
- `packages/plugin/src/ui/App.tsx` — new: stub component with exhaustive SandboxMessage switch
- `package-lock.json` — updated: 9 new devDependencies installed in packages/plugin

## Decisions Made

- Renamed HTML entry to `ui.html` (plan said `index.html`) — viteSingleFile preserves the file stem as the output name, so `src/ui/ui.html` produces `dist/ui.html` matching the manifest `"ui": "ui.html"` field. Using `index.html` would produce `dist/index.html` requiring additional renaming config.
- Used `npm-run-all2` instead of `npm-run-all` — the original `npm-run-all` package is archived on npm. `npm-run-all2` is the maintained community fork with identical API.
- `vite-plugin-singlefile@2.3.0` installed successfully — the RESEARCH.md open question about peer dep warnings for Vite 7 did not materialize. No fork needed.
- Added `root: path.resolve(__dirname, 'src/ui')` to `vite.config.ui.ts` — required for Vite to correctly resolve HTML-relative imports (`src="./index.tsx"`) from the HTML template's location.
- Set `noEmit: true` in `tsconfig.json` (UI tsconfig) — Vite owns build output; TypeScript only type-checks. Removed `outDir`/`rootDir` that are meaningless with `noEmit`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed HTML template from index.html to ui.html**
- **Found during:** Task 2 (UI build verification)
- **Issue:** The plan specified `src/ui/index.html` as the HTML template. With `viteSingleFile`, the output filename matches the input filename stem — so `index.html` would produce `dist/index.html`, not `dist/ui.html` as required by the manifest's `"ui": "ui.html"` field. Figma would fail to load the plugin.
- **Fix:** Named the file `ui.html` from the start; updated `vite.config.ui.ts` to use `src/ui/ui.html` as input.
- **Files modified:** `packages/plugin/src/ui/ui.html`, `packages/plugin/vite.config.ui.ts`
- **Verification:** `dist/ui.html` produced by build; `cat packages/plugin/dist/manifest.json` shows `"ui": "ui.html"` matches
- **Committed in:** 4f0779d (Task 1 commit), 2624daa (Task 2 commit)

**2. [Rule 3 - Blocking] Used npm-run-all2 instead of npm-run-all**
- **Found during:** Task 1 (devDependency installation)
- **Issue:** `npm-run-all` is archived on npm — installing it generates a deprecation warning and the package may have unresolved security issues. `npm-run-all2` is the maintained fork with identical API.
- **Fix:** Installed `npm-run-all2` instead; updated `package.json` scripts to use `npm-run-all` command (npm-run-all2 registers the same binary name).
- **Files modified:** `packages/plugin/package.json`
- **Verification:** `npm run dev` would start both watch processes in parallel; build scripts use `npm-run-all` command correctly
- **Committed in:** 4f0779d (Task 1 commit)

**3. [Rule 1 - Bug] Added root: src/ui to vite.config.ui.ts**
- **Found during:** Task 2 (UI build)
- **Issue:** Without `root: src/ui`, Vite resolves HTML-relative imports from the project root, causing `src="./index.tsx"` in the HTML to fail to locate `packages/plugin/src/ui/index.tsx`.
- **Fix:** Added `root: path.resolve(__dirname, 'src/ui')` to the vite.config.ui.ts; adjusted `outDir` to an absolute path so it still writes to `packages/plugin/dist/`.
- **Files modified:** `packages/plugin/vite.config.ui.ts`
- **Verification:** Build produces `dist/ui.html` containing fully inlined React bundle
- **Committed in:** 4f0779d (Task 1 commit)

**4. [Rule 1 - Bug] Set noEmit: true in tsconfig.json, removed rootDir/outDir**
- **Found during:** Task 2 (type-check)
- **Issue:** The plan's tsconfig.json included `outDir` and `rootDir` — these are meaningless when Vite handles the build. With composite tsconfig, tsc would try to emit files alongside Vite's output. Setting `noEmit: true` is correct for Vite projects.
- **Fix:** Set `"noEmit": true`, removed `outDir`/`rootDir` from compilerOptions, kept `references` for workspace type resolution.
- **Files modified:** `packages/plugin/tsconfig.json`
- **Verification:** `npm run type-check` exits 0; no `.d.ts` or `.js` files emitted by tsc in plugin/src
- **Committed in:** 2624daa (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs — incorrect output filename and missing root config, 1 blocking — deprecated package, 1 bug — noEmit)
**Impact on plan:** All fixes were required for correctness. The filename/root fixes are critical — without them, the built plugin would not load in Figma. The npm-run-all2 substitution is a drop-in replacement. No scope creep.

## Issues Encountered

- `vite-plugin-singlefile@2.3.0` (plan's first choice) worked with Vite 7.3.1 without peer dep warnings — RESEARCH.md open question resolved favorably; no fork needed.
- `npm-run-all` is archived; `npm-run-all2` is the active fork and registers the same binary names.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `packages/plugin/dist/` ready to load in Figma via "Import plugin from manifest" — developer can test immediately
- Typed message protocol stubs in place; Phase 2 (audit engine) can add `START_SCAN` handler to `code.ts` without changing the message dispatch structure
- Zero TypeScript errors across all packages — clean baseline for Plan 03 (round-trip message proof)
- Concern: `tsconfig.sandbox.json` does not extend from root `tsconfig.json` (project references) because composite tsconfigs with different typeRoots cannot share the same build info. This is intentional — sandbox is bundled by Vite, not tsc.

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
