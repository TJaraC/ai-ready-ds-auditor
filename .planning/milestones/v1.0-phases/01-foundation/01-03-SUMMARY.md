---
phase: 01-foundation
plan: 03
subsystem: plugin
tags: [figma-plugin, typescript, react, vite, message-protocol, round-trip, discriminated-union]

# Dependency graph
requires:
  - phase: 01-02
    provides: "dual Vite build, sandbox code.ts with SYNC_OUTDATED init, React UI stub with message handler skeleton, dist/ ready to load"
provides:
  - "Round-trip message proof: UI sends UIMessage START_SCAN, sandbox echoes SCAN_PROGRESS back, UI displays it in scrollable log"
  - "Scrollable message log component in App.tsx with timestamped entries"
  - "dist/manifest.json with correct relative paths (code.js / ui.html) for Figma import"
  - "Human-verified: plugin loads in Figma Desktop, round-trip completes, no console errors"
  - "Phase 1 complete: typed sandbox/UI message protocol proven in live Figma session"
affects: [02-audit-engine, 03-data-injection, 04-mcp-server, 05-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Figma plugin message log pattern: log state array + appendLog helper + timestamped entries rendered as <div> list"
    - "Round-trip proof pattern: sandbox sends SYNC_OUTDATED on init → UI appends to log; button sends START_SCAN → sandbox echoes SCAN_PROGRESS → UI appends to log"
    - "manifest.json source uses dist/ prefixed paths (dist/code.js, dist/ui.html) for developer import; build:manifest script strips prefix for the built copy"

key-files:
  created: []
  modified:
    - "packages/plugin/src/ui/App.tsx"
    - "packages/plugin/manifest.json"
    - "packages/plugin/package.json"

key-decisions:
  - "dist/manifest.json paths must be relative (code.js / ui.html), not dist/-prefixed — build:manifest script strips prefix when copying to dist/"
  - "Source manifest.json uses dist/-prefixed paths so developers can import from packages/plugin/ directly in Figma Desktop without navigating into dist/"

patterns-established:
  - "build:manifest script: copies source manifest to dist/ and strips dist/ prefix from main/ui paths — both source and dist manifests remain correct for their respective contexts"

requirements-completed: [PLUG-04]

# Metrics
duration: ~25min (including human verification checkpoint)
completed: 2026-03-03
---

# Phase 1 Plan 03: Round-Trip Message Proof Summary

**Typed sandbox/UI round-trip verified in live Figma Desktop session: SYNC_OUTDATED on init, START_SCAN button triggers SCAN_PROGRESS echo, all messages narrowed via discriminated union with no `any` casts**

## Performance

- **Duration:** ~25 min (includes human checkpoint verification)
- **Started:** 2026-03-03T09:20:00Z
- **Completed:** 2026-03-03T09:40:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint, approved)
- **Files modified:** 3

## Accomplishments

- Added "Ping round-trip" button to App.tsx that sends `UIMessage { type: 'START_SCAN' }` to sandbox; sandbox echoes `SCAN_PROGRESS` back
- Replaced single-status display with scrollable timestamped message log — every sandbox message appends a timestamped entry
- Fixed manifest path handling: source manifest uses `dist/`-prefixed paths for developer Figma import; build:manifest strips prefix for the dist/ copy
- Human verification APPROVED: plugin loaded in Figma Desktop, "Sandbox ready" appeared on init (SYNC_OUTDATED received), "Ping round-trip" button produced SCAN_PROGRESS entry in log, no console errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add round-trip ping button and message log to App.tsx** - `89e5790` (feat)
2. **Fix: manifest source uses dist/ paths, build:manifest strips prefix** - `72d493a` (fix)

## Files Created/Modified

- `packages/plugin/src/ui/App.tsx` - Added scrollable message log, "Ping round-trip" button sending START_SCAN, SYNC_OUTDATED sets "Sandbox ready" status and appends to log
- `packages/plugin/manifest.json` - Updated main/ui fields to use dist/-prefixed paths for developer-direct import
- `packages/plugin/package.json` - Updated build:manifest script to strip dist/ prefix when writing dist/manifest.json

## Final Build State

| File | Size |
|------|------|
| `dist/code.js` | 471 B (0.47 kB) |
| `dist/ui.html` | 195,551 B (~191 kB / ~61 kB gzip) |
| `dist/manifest.json` | 246 B |

## Decisions Made

- Source `packages/plugin/manifest.json` now uses `"main": "dist/code.js"` and `"ui": "dist/ui.html"` — this allows a developer to point Figma Desktop at the package root manifest directly (Figma resolves paths relative to the manifest location, so dist/-prefixed paths resolve correctly from the package root).
- `build:manifest` script strips the `dist/` prefix when writing `dist/manifest.json` — so the built copy keeps correct relative paths (`code.js` / `ui.html`) that Figma resolves from the dist/ directory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed manifest path mismatch preventing plugin load in Figma**
- **Found during:** Task 1 (human verification checkpoint — Figma failed to load plugin from dist/manifest.json)
- **Issue:** The source `manifest.json` used bare paths (`main: "code.js"`, `ui: "ui.html"`). When Figma Desktop imports the manifest from `packages/plugin/dist/`, those paths are correct. However, Plan 02's `build:manifest` script copied the source manifest as-is without adjustment. The real issue was that the Plan 02 source manifest pointed at the source locations (`src/sandbox/code.ts` etc.) rather than dist/ output — causing Figma to fail to load the plugin when importing from the dist/ directory.
- **Fix:** Updated source manifest to use `dist/code.js` / `dist/ui.html` paths (for developer-direct import from package root). Updated `build:manifest` in package.json to strip the `dist/` prefix from main/ui when writing the dist/ copy (so the built manifest stays correct with relative paths from dist/).
- **Files modified:** `packages/plugin/manifest.json`, `packages/plugin/package.json`
- **Verification:** Human verified plugin loaded successfully in Figma Desktop after rebuild — no errors
- **Committed in:** `72d493a` (fix commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking)
**Impact on plan:** Fix was required for the human verification checkpoint to succeed. No scope creep — single targeted fix to manifest path resolution.

## Issues Encountered

- Manifest path resolution in Figma Desktop: Figma resolves manifest `main`/`ui` fields relative to the manifest file's location. A manifest at `dist/manifest.json` needs bare paths (`code.js`); a manifest at `packages/plugin/manifest.json` needs dist/-prefixed paths (`dist/code.js`). The build:manifest script now handles the translation automatically.

## User Setup Required

None - no external service configuration required.

## Phase 1 Completion

**Phase 1: Foundation is COMPLETE.**

All 5 success criteria from ROADMAP.md are satisfied:

1. `npm run build` compiles all three packages with zero TypeScript errors (strict mode) — verified
2. `packages/shared` exports `AuditReport`, `AuditMeta`, `DesignToken`, `ComponentSpec`, chunking constants, `schemaVersion` — verified in Plan 01
3. `npm run dev` in plugin package produces `code.js` and single-file `ui.html` — verified in Plan 02
4. Round-trip message completes in Figma Desktop (SYNC_OUTDATED → SCAN_PROGRESS → displayed in log) — **human verified this plan**
5. ESLint and Prettier pass across all packages with `npm run lint` — verified in Plan 02

Phase 2 (Audit Engine) can begin: the typed message protocol is proven, `START_SCAN` handler in `code.ts` is the natural entry point for the real audit logic.

## Next Phase Readiness

- `packages/plugin/dist/` verified working in Figma Desktop — Phase 2 can extend the sandbox handler without rebuilding the UI from scratch
- `figma.ui.onmessage` handles `START_SCAN` via exhaustive dispatch — Phase 2 replaces the stub echo with real scene graph traversal
- Shared types (`AuditReport`, `SandboxMessage`, `UIMessage`) are finalized — Phase 2 produces typed `AuditReport` without changing the message boundary
- No open blockers for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
