---
phase: 03-data-injection-plugin-ui
plan: 01
subsystem: plugin
tags: [figma, plugin-data, chunking, inject, sandbox, typescript]

# Dependency graph
requires:
  - phase: 02-audit-engine
    provides: runAudit() function returning AuditReport
  - phase: 01-foundation
    provides: shared types (AuditReport, AuditMeta), constants (CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES), message types (INJECT_COMPLETE, INJECT_ERROR, SYNC_OUTDATED)
provides:
  - injectReport(report: AuditReport): InjectionResult — serializes and chunks AuditReport into figma.root plugin data
  - INJECT_DATA handler in code.ts — runs audit then injects, sends INJECT_COMPLETE/INJECT_ERROR
  - documentchange listener with 2-second debounce — sends SYNC_OUTDATED when document changes
affects:
  - 03-02-plugin-ui (UI reads INJECT_COMPLETE/INJECT_ERROR/SYNC_OUTDATED messages)
  - 04-mcp-server (reads ai_data_1..N + ai_data_meta from Figma plugin data)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Chunked plugin data write with 1-based keys (ai_data_1, ai_data_2...) + ai_data_meta written last
    - Character-count chunking (81,000 chars = MAX_CHUNK_BYTES * 0.9) avoids multi-byte split issues
    - globalThis cast for TextEncoder access under ES2019 lib with json.length fallback
    - Debounced figma.on('documentchange') with module-level timer variable for stale-data detection

key-files:
  created:
    - packages/plugin/src/sandbox/inject.ts
  modified:
    - packages/plugin/src/sandbox/code.ts

key-decisions:
  - "TextEncoder accessed via (globalThis as any).TextEncoder to avoid TS2304 under lib:ES2019; falls back to json.length if unavailable at runtime"
  - "Chunk boundary by character count (81,000 chars), not bytes — avoids splitting multi-byte UTF-8 sequences mid-character"
  - "ai_data_meta written LAST so MCP reader can detect incomplete writes by checking meta existence"
  - "setPluginData(key, '') used for key deletion (Figma API pattern — empty string removes the key)"
  - "documentchange listener at module level (not inside onmessage) so it fires regardless of UI interaction"

patterns-established:
  - "Injection pipeline: serialize -> clear old keys -> chunk by chars -> write chunks -> write meta last -> return result"
  - "Error handling: all async operations wrapped in try/catch or .catch(), errors post INJECT_ERROR/SCAN_ERROR to UI"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 3 Plan 01: Sandbox Injection Pipeline Summary

**Chunked AuditReport-to-figma-plugin-data pipeline with 81,000-char chunks, ai_data_meta written last, and debounced documentchange listener for stale-data detection**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T19:28:00Z
- **Completed:** 2026-03-03T19:29:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `inject.ts` with `injectReport()` that clears, chunks, and writes AuditReport to figma.root plugin data keys
- Wired `INJECT_DATA` handler in `code.ts` to run full audit then inject, posting `INJECT_COMPLETE` or `INJECT_ERROR`
- Registered `figma.on('documentchange')` listener at module level with 2-second debounce posting `SYNC_OUTDATED`
- Full plugin build (`npm run build`) passes with zero errors producing `dist/code.js` (5.76 kB)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create inject.ts — chunked injection function** - `01b3bfc` (feat)
2. **Task 2: Wire INJECT_DATA handler and documentchange listener in code.ts** - `dd29bd2` (feat)

**Plan metadata:** `[to be added]` (docs: complete plan)

## Files Created/Modified
- `packages/plugin/src/sandbox/inject.ts` - Pure chunked injection function; exports `injectReport` and `InjectionResult`
- `packages/plugin/src/sandbox/code.ts` - INJECT_DATA case wired to inject pipeline; documentchange listener added

## Decisions Made
- TextEncoder accessed via `(globalThis as any).TextEncoder` with `json.length` fallback — ES2019 lib doesn't include TextEncoder type, but the Figma sandbox has it at runtime
- Chunk splitting by character count (81,000 chars) not byte slicing — prevents splitting multi-byte UTF-8 sequences (RESEARCH.md Pitfall 3)
- `ai_data_meta` written last so MCP reader can detect incomplete injection states
- `setPluginData(key, '')` is the correct deletion pattern per Figma API docs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Used globalThis cast for TextEncoder under ES2019 lib**
- **Found during:** Task 1 (inject.ts creation)
- **Issue:** `lib: ["ES2019"]` in tsconfig.sandbox.json does not include `TextEncoder` type, causing TS2304 compile error
- **Fix:** Access via `(globalThis as any).TextEncoder` with undefined check and `json.length` fallback — preserves runtime behavior while satisfying TypeScript
- **Files modified:** packages/plugin/src/sandbox/inject.ts
- **Verification:** `npx tsc --noEmit --project tsconfig.sandbox.json` shows zero new errors from inject.ts
- **Committed in:** 01b3bfc (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical / type compatibility)
**Impact on plan:** Necessary fix for TypeScript compilation under ES2019 sandbox config. Runtime behavior is identical to the plan specification.

## Issues Encountered
- Pre-existing TypeScript errors in Phase 2 files (rootDir mismatch for @shared imports, color.ts symbol comparison) exist in tsconfig.sandbox.json check — these are unrelated to this plan's changes and were present before Task 1. The Vite build (which is what actually ships) produces zero errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Write side of MCP data pipeline is complete: `injectReport()` writes structured AuditReport chunks to figma.root plugin data
- MCP server (Phase 4) can read `ai_data_meta` to discover chunk count, then read `ai_data_1..N` to reconstruct the full report
- UI can now send `INJECT_DATA` message and receive `INJECT_COMPLETE` (with bytesWritten/chunkCount) or `INJECT_ERROR`
- `SYNC_OUTDATED` fires automatically 2 seconds after any relevant document change

## Self-Check: PASSED

- packages/plugin/src/sandbox/inject.ts: FOUND
- packages/plugin/src/sandbox/code.ts: FOUND
- .planning/phases/03-data-injection-plugin-ui/03-01-SUMMARY.md: FOUND
- Commit 01b3bfc (feat: inject.ts): FOUND
- Commit dd29bd2 (feat: code.ts): FOUND

---
*Phase: 03-data-injection-plugin-ui*
*Completed: 2026-03-03*
