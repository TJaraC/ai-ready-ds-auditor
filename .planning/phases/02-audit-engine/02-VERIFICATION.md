---
phase: 02-audit-engine
verified: 2026-03-03T14:51:00Z
status: human_needed
score: 10/11 must-haves verified
re_verification: false
human_verification:
  - test: "Load built plugin in Figma Desktop and trigger START_SCAN"
    expected: "SCAN_PROGRESS messages appear (one per page), then SCAN_COMPLETE with a valid AuditReport structure (schemaVersion: '1.0.0', numeric summary counts, issues array)"
    why_human: "Figma sandbox runtime behavior cannot be simulated programmatically — requires the actual Figma Desktop JS engine to execute the plugin"
---

# Phase 2: Audit Engine Verification Report

**Phase Goal:** The plugin can scan any Figma document and produce a complete, typed AuditReport identifying hardcoded colors, typography, spacing, and disconnected components
**Verified:** 2026-03-03T14:51:00Z
**Status:** human_needed (all automated checks pass; one item requires Figma Desktop to confirm)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Plugin detects fills/strokes using raw hex/rgb instead of bound variables or color styles | VERIFIED | `auditFills` + `auditStrokes` in color.ts: checks `fillStyleId`/`strokeStyleId` against styleIds set, then checks `!solidFill.boundVariables?.color`, calls `rgbToHex` for offending value |
| 2  | Plugin detects text nodes with hardcoded fontSize/fontWeight not bound to text styles or variables | VERIFIED | `auditTypography` in typography.ts: checks `textStyleId` against styleIds set, then checks `!boundVars?.fontSize` and `!boundVars?.fontWeight` with `figma.mixed` guard |
| 3  | Plugin detects auto-layout nodes with hardcoded padding/itemSpacing not using spacing variables | VERIFIED | `auditSpacing` in spacing.ts: early return on `layoutMode === 'NONE'`, checks `bv?.[field]`, skips zero values |
| 4  | Plugin detects frame/group layers matching existing components but not instances | VERIFIED | `auditComponents` in components.ts: type gate `node.type !== 'FRAME' && node.type !== 'GROUP'`, name-match against componentNames Set |
| 5  | Each audit issue includes node ID, node name, page name, issue type, offending value, and suggested fix — assembled into typed AuditReport with schemaVersion | VERIFIED | `buildIssue` in utils.ts constructs all AuditIssue fields; `assembleReport` sets schemaVersion from `@shared/index`, computes all summary fields; 20 Vitest tests pass confirming this |
| 6  | npm run build exits 0 producing dist/code.js and dist/ui.html | VERIFIED | Build output: `dist/code.js` (4.46 kB), `dist/ui.html` (195.55 kB / 61.78 kB gzip) — zero build errors |
| 7  | npm run type-check exits 0 with zero TypeScript errors | VERIFIED | `tsc --build` exits 0 with no output (zero errors) |
| 8  | All 20 Vitest unit tests pass | VERIFIED | `npx vitest run utils.test.ts` → 20 passed, 0 failed; full workspace: 24 tests passed |
| 9  | dist/code.js contains no ?. or ?? operators (ES2019 compliance for Figma sandbox) | VERIFIED | `grep -c '\?\.' dist/code.js` → 0; `grep -c '\?\?' dist/code.js` → 0 |
| 10 | START_SCAN handler calls runAudit() and posts SCAN_COMPLETE or SCAN_ERROR | VERIFIED | code.ts lines 13-25: `runAudit().then(report => postMessage({type:'SCAN_COMPLETE', report})).catch(err => postMessage({type:'SCAN_ERROR', message}))` |
| 11 | Human verifies: triggering START_SCAN in Figma produces SCAN_COMPLETE with valid AuditReport | NEEDS HUMAN | Cannot simulate Figma sandbox JS runtime programmatically |

**Score:** 10/11 truths verified (automated), 1 pending human verification

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/plugin/src/sandbox/audit/utils.ts` | Pure helpers: rgbToHex, buildIssueId, buildIssue, assembleReport | VERIFIED | 87 lines; exports all 4 functions; imports from `@shared/index` (schemaVersion) and `@shared/types` (type imports only); zero Figma API dependencies |
| `packages/plugin/src/sandbox/audit/utils.test.ts` | 20-test Vitest suite covering all pure functions | VERIFIED | 199 lines; 20 tests across 4 describe blocks; all pass |
| `packages/plugin/vitest.config.ts` | Vitest config with @shared path alias | VERIFIED | 16 lines; `@shared` alias points to `../shared/src`; environment: node |
| `packages/plugin/src/sandbox/audit/color.ts` | auditFills + auditStrokes | VERIFIED | 104 lines; exports both functions; imports `buildIssue`, `rgbToHex` from `./utils`; handles figma.mixed, non-SOLID paints, style binding |
| `packages/plugin/src/sandbox/audit/typography.ts` | auditTypography | VERIFIED | 68 lines; exports function; imports `buildIssue` from `./utils`; guards figma.mixed before String() on fontSize and fontWeight |
| `packages/plugin/src/sandbox/audit/spacing.ts` | auditSpacing | VERIFIED | 54 lines; exports function; imports `buildIssue` from `./utils`; skips layoutMode=NONE and zero values |
| `packages/plugin/src/sandbox/audit/components.ts` | auditComponents | VERIFIED | 35 lines; exports function; imports `buildIssue` from `./utils`; gates on FRAME/GROUP only |
| `packages/plugin/src/sandbox/audit/index.ts` | runAudit() async orchestrator | VERIFIED | 112 lines; exports `runAudit()`; two-pass traversal across all pages; GROUP nodes audited for fills/strokes/components but NOT spacing |
| `packages/plugin/src/sandbox/code.ts` | Wired START_SCAN handler | VERIFIED | Lines 2, 13-25: imports runAudit from `./audit/index`; START_SCAN case wired to runAudit().then(SCAN_COMPLETE).catch(SCAN_ERROR) |
| `packages/plugin/dist/code.js` | Production build artifact | VERIFIED | 4.46 kB; built successfully; zero ?. or ?? operators |
| `packages/plugin/dist/ui.html` | Single-file UI artifact | VERIFIED | 195.55 kB (61.78 kB gzip) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `utils.ts` | `@shared/index` | `import { schemaVersion }` | WIRED | Line 1: `import { schemaVersion } from '@shared/index'` |
| `utils.ts` | `@shared/types` | `import type { AuditIssue, AuditReport, ComponentSpec, DesignToken }` | WIRED | Line 2: `import type { AuditIssue, AuditReport, ComponentSpec, DesignToken } from '@shared/types'` |
| `utils.test.ts` | `utils.ts` | `import { rgbToHex, buildIssueId, buildIssue, assembleReport }` | WIRED | Line 2: `import { rgbToHex, buildIssueId, buildIssue, assembleReport } from './utils'` |
| `color.ts` | `utils.ts` | `import { buildIssue, rgbToHex }` | WIRED | Line 2: `import { buildIssue, rgbToHex } from './utils'` |
| `typography.ts` | `utils.ts` | `import { buildIssue }` | WIRED | Line 2: `import { buildIssue } from './utils'` |
| `spacing.ts` | `utils.ts` | `import { buildIssue }` | WIRED | Line 2: `import { buildIssue } from './utils'` |
| `components.ts` | `utils.ts` | `import { buildIssue }` | WIRED | Line 2: `import { buildIssue } from './utils'` |
| `audit/index.ts` | `figma.getLocalPaintStylesAsync` | async pre-load before page traversal | WIRED | Line 24: `figma.getLocalPaintStylesAsync()` |
| `audit/index.ts` | `figma.ui.postMessage` | SCAN_PROGRESS after each page | WIRED | Lines 102-107: `figma.ui.postMessage(progressMsg)` where `progressMsg.type === 'SCAN_PROGRESS'` |
| `code.ts` | `audit/index.ts` | `import { runAudit }` | WIRED | Line 2: `import { runAudit } from './audit/index'` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUDIT-01 | 02-03 | Audit engine traverses full scene graph of the active Figma document | VERIFIED | index.ts: two-pass traversal over `figma.root.children`, each page loaded with `page.loadAsync()`, findAllWithCriteria for TEXT, FRAME, COMPONENT, INSTANCE, shape types, and GROUP nodes |
| AUDIT-02 | 02-02 | Color auditor detects fills/strokes using raw hex/rgb instead of bound variables or color styles | VERIFIED | color.ts: auditFills + auditStrokes check fillStyleId/strokeStyleId against styleIds set, then check `!solidFill.boundVariables?.color` for SOLID paints |
| AUDIT-03 | 02-02 | Typography auditor detects text nodes with hardcoded fontSize/fontWeight not bound to text styles or variables | VERIFIED | typography.ts: auditTypography checks textStyleId, then `!boundVars?.fontSize` and `!boundVars?.fontWeight` |
| AUDIT-04 | 02-02 | Spacing auditor detects auto-layout nodes with hardcoded padding/itemSpacing not using spacing variables | VERIFIED | spacing.ts: auditSpacing checks all 5 spacing fields (paddingLeft, paddingRight, paddingTop, paddingBottom, itemSpacing) against boundVariables |
| AUDIT-05 | 02-02, 02-03 | Component auditor detects frame/group layers matching existing component names but not instances | VERIFIED | components.ts: FRAME/GROUP type gate + name-match against componentNames Set; GROUP nodes explicitly included in index.ts traversal (lines 93-98) |
| AUDIT-06 | 02-01 | Each audit result includes: node ID, node name, page name, issue type, offending value, and suggested fix | VERIFIED | buildIssue in utils.ts constructs all 8 required fields; 3 tests in buildIssue describe block verify each field |
| AUDIT-07 | 02-01 | Audit engine produces typed AuditReport conforming to shared types schema | VERIFIED | assembleReport in utils.ts returns AuditReport with all required fields; TypeScript strict mode enforces conformance; 20 tests pass |
| AUDIT-08 | 02-03 | Audit supports progress reporting to the UI during long scans | VERIFIED | index.ts lines 101-107: SCAN_PROGRESS message sent after each page with percent (0-100) and currentNode (page name) |
| AUDIT-09 | 02-01 | Every AuditReport includes schemaVersion field for forward compatibility | VERIFIED | assembleReport uses `schemaVersion` imported from `@shared/index`; test "sets schemaVersion to 1.0.0 from @shared" passes |

All 9 AUDIT requirements (AUDIT-01 through AUDIT-09) are covered by plans 02-01, 02-02, and 02-03. No orphaned requirements detected. The phase goal mention of "AUDIT-01 to AUDIT-05" was a partial list; ROADMAP lists all 9 as Phase 2 requirements and all 9 are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `code.ts` | 27-29 | `case 'INJECT_DATA': { break; }` — stub handler | Info | Intentional Phase 3 stub; does not block Phase 2 goal |
| `audit/index.ts` | 33 | `void varIds;` — collected but unused variable IDs | Info | Acknowledged in code comment "reserved for future use"; does not block goal |

No blockers found. The INJECT_DATA stub is a documented Phase 3 placeholder. varIds collection is infrastructure for future auditor improvements.

### Human Verification Required

#### 1. Full End-to-End Scan in Figma Desktop

**Test:** Load the built plugin from `packages/plugin/dist/manifest.json` in Figma Desktop (Plugins > Development > Import plugin from manifest). Open a Figma file with some content. Open the Plugin Developer Console. Trigger a scan (click the scan button in the plugin UI).

**Expected:**
- One or more `SCAN_PROGRESS` messages appear in the plugin UI log, each showing a page percentage and name
- A final `SCAN_COMPLETE` message appears
- The AuditReport structure in the console shows: `schemaVersion: "1.0.0"`, numeric `summary.totalIssues`, a `summary.healthScore`, `issues` array, and `components` array
- No JavaScript errors in the Developer Console during scan
- Optionally: placing a rectangle with a solid fill via the hex picker (not a variable) and re-scanning shows at least one `hardcoded-fill` issue in the report

**Why human:** The Figma sandbox is a proprietary JavaScript runtime. The ES2019 build target fix (lowering from default to avoid `?.` and `??` operators) was already applied and verified in the build artifacts, but the only way to confirm the complete async page-traversal pipeline works under the real Figma engine is to load and run the plugin. The automated checks confirm correct code structure, types, and logic — but not runtime execution in Figma's environment.

### Gaps Summary

No gaps identified. All automated must-haves are verified. The single pending item is the human Figma verification checkpoint, which was specified in plan 02-03 as a blocking gate and is a normal part of this phase's definition of done.

---

_Verified: 2026-03-03T14:51:00Z_
_Verifier: Claude (gsd-verifier)_
