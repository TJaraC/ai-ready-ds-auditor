---
phase: 03-data-injection-plugin-ui
plan: 03
subsystem: plugin
tags: [figma, plugin-api, react, typescript, audit-engine, vite]

# Dependency graph
requires:
  - phase: 03-data-injection-plugin-ui/03-01
    provides: inject.ts, INJECT_DATA handler, documentchange listener
  - phase: 03-data-injection-plugin-ui/03-02
    provides: production two-tab App.tsx with state machine

provides:
  - themeColors: true in figma.showUI — Figma CSS variables active for light/dark theming
  - INJECT_DATA sends SCAN_COMPLETE with report before INJECT_COMPLETE
  - Audit scoped to COMPONENT descendants only (not arbitrary canvas frames)
  - New auditors: cornerRadius, strokeWeight, drop/inner shadow, lineHeight, letterSpacing
  - SYNC_OUTDATED suppressed during injection via lastInjectedAt grace period
  - Banner clears immediately when Re-inject is clicked
  - Human-verified in Figma Desktop: all 5 test cases pass

affects:
  - 04-mcp-server (reads complete AuditReport with all categories including 'border' and 'effects')

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Time-based grace period (lastInjectedAt + POST_INJECTION_GRACE_MS) to suppress documentchange noise from setPluginData writes"
    - "figma.loadAllPagesAsync() required before registering documentchange handler in dynamic-page mode"
    - "IIFE format required for Figma sandbox — optional catch binding (catch {}) causes parser error; use typeof guard instead"
    - "figma.getNodeByIdAsync() required in dynamic-page mode — sync getNodeById() throws"
    - "Plugin id field in manifest.json required for setPluginData/getPluginDataKeys API access"

key-files:
  created:
    - packages/plugin/src/sandbox/audit/border.ts
    - packages/plugin/src/sandbox/audit/effects.ts
  modified:
    - packages/plugin/src/sandbox/code.ts
    - packages/plugin/src/sandbox/audit/index.ts
    - packages/plugin/src/sandbox/audit/typography.ts
    - packages/plugin/src/ui/App.tsx
    - packages/shared/src/types.ts

key-decisions:
  - "Audit scoped to COMPONENT descendants — avoids 8000+ noise issues from arbitrary canvas frames; targets actual design system quality"
  - "Time-based grace period (5s) for SYNC_OUTDATED suppression — isInjecting flag approach failed because documentchange events fire asynchronously after setPluginData returns"
  - "setIsOutOfSync(false) on handleAuditAndInject start — banner clears immediately on Re-inject click, not waiting for INJECT_COMPLETE"
  - "lineHeight AUTO and letterSpacing 0 skipped — both are normal/default values that carry no design intent"
  - "cornerRadius figma.mixed skipped — individual per-corner radii are a future improvement"
  - "Plugin manifest id field required — empty id string causes getPluginDataKeys to throw"

patterns-established:
  - "Pattern: figma.loadAllPagesAsync() must precede figma.on('documentchange') registration in dynamic-page plugins"
  - "Pattern: avoid optional catch binding (catch {}) in sandbox code — Figma's JS parser rejects it; esbuild re-optimizes catch(_e) back to catch{} if _e is unused"
  - "Pattern: use figma.getNodeByIdAsync() in dynamic-page manifests — sync variant throws"
  - "Pattern: lastInjectedAt timestamp + grace period for suppressing write-triggered events"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10]

# Metrics
duration: ~90min (including Figma verification and bug fixes)
completed: 2026-03-03
---

# Phase 3 Plan 03: Verify & Polish Summary

**Production plugin verified in Figma Desktop: scoped audit (components only), 6 issue categories (color, typography, spacing, border, effects, component), SYNC_OUTDATED suppression, and Re-inject flow all working correctly**

## Performance

- **Duration:** ~90 min (including iterative Figma verification and fixes)
- **Started:** 2026-03-03T20:00:00Z
- **Completed:** 2026-03-03T21:30:00Z
- **Tasks:** 3 (Task 1 auto, Task 2 auto, Task 3 human-verified ✅)
- **Files modified:** 7

## Accomplishments
- Fixed 5 Figma API compatibility issues discovered during live testing (parser, async API, manifest id, documentchange registration, setPluginData noise)
- Extended audit engine: scoped to COMPONENT descendants, added border.ts (cornerRadius + strokeWeight), effects.ts (shadows), lineHeight and letterSpacing to typography.ts
- SYNC_OUTDATED grace period prevents false "outdated" banner after injection
- Human verified all 5 test cases in Figma Desktop — phase approved

## Task Commits

1. **Task 1: themeColors + SCAN_COMPLETE patch** - `17f688d` (fix)
2. **fix: catch{} → typeof guard (parser)** - `c7895a4` (fix)
3. **fix: loadAllPagesAsync before documentchange** - `063a9ea` (fix)
4. **fix: getNodeByIdAsync for SELECT_NODE** - `82b367f` (fix)
5. **fix: time-based grace period + Re-inject clears banner** - `3c5f0d0` (fix)
6. **fix: remove leftover isInjecting reference** - `89e4bd4` (fix)
7. **feat: scope + border + effects + lineHeight + letterSpacing** - `fc7aa2e` (feat)

## Files Created/Modified
- `packages/plugin/src/sandbox/code.ts` — themeColors, SCAN_COMPLETE sequence, loadAllPagesAsync, getNodeByIdAsync, lastInjectedAt grace period
- `packages/plugin/src/sandbox/audit/index.ts` — scoped to COMPONENT descendants, effectStyles loading, new auditors wired
- `packages/plugin/src/sandbox/audit/border.ts` — new: cornerRadius and strokeWeight detection
- `packages/plugin/src/sandbox/audit/effects.ts` — new: hardcoded shadow detection
- `packages/plugin/src/sandbox/audit/typography.ts` — added lineHeight and letterSpacing
- `packages/plugin/src/ui/App.tsx` — CATEGORY_ORDER extended, setIsOutOfSync(false) on Re-inject
- `packages/shared/src/types.ts` — 'border' | 'effects' added to AuditIssue.category

## Decisions Made
- Scoped audit to COMPONENT descendants: file had 8656 issues on full canvas, ~focused number when scoped to components. Design system audit should reflect component quality, not canvas clutter.
- Time-based grace period (5s) over isInjecting flag: setPluginData writes trigger documentchange asynchronously; a synchronously cleared flag was always too early.
- Individual per-corner radii (figma.mixed cornerRadius) deferred to future — requires checking topLeftRadius/topRightRadius etc. separately.

## Deviations from Plan

### Auto-fixed Issues

**1. [Figma Parser] Optional catch binding rejected by Figma's JS parser**
- catch {} without binding is ES2019 syntax; Figma's sandbox parser throws "Unexpected token {"
- esbuild also re-optimizes catch(_e) → catch {} when _e is unused
- Fix: replaced try/catch with typeof TextEncoder === 'function' guard entirely

**2. [Figma API] documentchange requires loadAllPagesAsync() first**
- Throws "Cannot register documentchange handler in incremental mode without calling figma.loadAllPagesAsync first"
- Fix: wrapped figma.on('documentchange') in figma.loadAllPagesAsync().then()

**3. [Figma API] getNodeById() throws in dynamic-page mode**
- Fix: replaced with figma.getNodeByIdAsync() in SELECT_NODE handler

**4. [Manifest] Missing plugin id causes getPluginDataKeys to throw**
- "Cannot get private plugin data keys in a plugin without an ID"
- Fix: user registered plugin in Figma Developer tools and added id to manifest.json

**5. [Logic] SYNC_OUTDATED appears 2s after injection**
- setPluginData writes trigger documentchange PROPERTY_CHANGE events
- isInjecting flag approach failed (events fire after flag is cleared)
- Fix: time-based lastInjectedAt + 5s POST_INJECTION_GRACE_MS

---

**Total deviations:** 5 auto-fixed (all Figma API compatibility issues)
**Impact on plan:** All fixes necessary for Figma sandbox compatibility. No scope creep. Audit engine expansion (scope + new detectors) was a user-requested addition that improves DS audit quality.

## Issues Encountered
None beyond the 5 Figma API compatibility issues above, all resolved.

## User Setup Required
- Plugin must have a valid `id` field in manifest.json (obtained via Figma Desktop → Plugins → Development → New Plugin)

## Next Phase Readiness
- Phase 3 complete: plugin audits component-scoped issues across 6 categories, injects chunked AuditReport to figma.root plugin data, UI shows health dashboard and AI Context tab
- Phase 4 (MCP Server) can begin: reads ai_data_meta + ai_data_1..N chunks from Figma REST API, reconstructs AuditReport, exposes 3 MCP tools
- Blocker to verify before Phase 4: confirm figma.root pluginData is accessible via Figma REST API on free tier

---
*Phase: 03-data-injection-plugin-ui*
*Completed: 2026-03-03*
