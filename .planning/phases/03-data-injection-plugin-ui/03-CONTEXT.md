# Phase 3: Data Injection & Plugin UI - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Plugin injects the AuditReport into the Figma file via `setPluginData` with automatic chunking (≤90kB/chunk), detects when injected data goes stale (components/styles/variables changed), and presents a production-quality two-tab UI. The primary tab ("Audit") runs the scan and shows results; the secondary tab ("AI Context") handles CSS framework selection and MCP setup. Creating the MCP server that reads this data is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Injection Flow
- Single combined CTA: one "Audit & Inject" button kicks off the full flow (scan → dashboard → inject)
- After scan completes, dashboard appears with metrics; a second prominent button "Inject AI Context" saves the chunked JSON to the Figma file
- Success state shows "✅ Ready for Trae/Cursor" after successful injection
- Priority: brutal simplicity — the designer should never need to understand chunking or JSON internals

### Health Dashboard Layout
- 4 stat cards in a 2×2 grid above the issue list: Tokens, Components, Total Issues, Health Score
- Issue list below the grid: grouped by category (Color / Typography / Spacing / Components), each group is a collapsible section with issue count badge
- Each issue row: node name + offending value (e.g., "Button/Primary — #FF5733"); clicking a row navigates the canvas to that node (SELECT_NODE already wired)
- Initial / first-run state: welcome screen with only the large "Audit & Inject" button centered — no empty placeholders or instructions

### Out of Sync Indicator
- A banner (red/amber) appears at the top of the "Audit" tab when data is stale: "⚠️ AI Context may be outdated — Re-inject to update"
- Detection mechanism: `figma.on('documentchange')` filtering events that affect components, styles, or variables (not every small edit)
- The banner contains an inline "Re-inject" button that triggers the full Audit & Inject flow directly — no need to scroll to the main CTA

### AI Context Tab
- Tab names: **"Audit"** (primary) and **"AI Context"** (secondary)
- CSS framework selector: native `<select>` dropdown (Tailwind CSS, CSS Variables, CSS Modules, Styled Components)
- File ID section: read-only text field showing the Figma File ID + "Copy" button + a pre-formatted JSON snippet showing exactly how to add it to mcp.json for Trae/Cursor — reduces MCP setup friction to copy-paste

### Claude's Discretion
- Exact color palette and typography for the plugin UI (should feel native to Figma's design language)
- Animation/transition details for collapsible sections and progress feedback during scan
- Exact chunking implementation details (TextEncoder byte counting, key naming)
- Error message copy for injection failures (file permission errors, chunk write failures)
- Loading skeleton or spinner style during the scan phase

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `figma.showUI(__html__, { width: 320, height: 480 })` — window size locked at 320×480px; all layouts must fit this constraint
- `SELECT_NODE` message handler in `code.ts` — already calls `figma.viewport.scrollAndZoomIntoView`; issue click-to-navigate works without new sandbox code
- `INJECT_DATA` stub in `code.ts` — Phase 3 implements the body of this handler
- `INJECT_COMPLETE` / `INJECT_ERROR` message types already typed in `messages.ts`
- `SYNC_OUTDATED` message sent from sandbox on startup — already received by `App.tsx` (currently just logged)
- `CHUNK_KEY_PREFIX = 'ai_data_'`, `META_KEY = 'ai_data_meta'`, `MAX_CHUNK_BYTES = 90_000` in `constants.ts`
- `AuditReport.summary` already has `healthScore`, `issuesByCategory`, `totalIssues`, `totalTokens`, `totalComponents`

### Established Patterns
- Message protocol: UI → sandbox via `parent.postMessage({ pluginMessage: msg }, '*')`, sandbox → UI via `figma.ui.postMessage(msg)` — strictly typed unions, exhaustiveness checked
- React functional components with `useState` / `useEffect` — no external state library introduced yet
- Inline styles only (no CSS files, no Tailwind) — Figma plugin bundler constraint with current Vite setup

### Integration Points
- `code.ts` switch statement: `INJECT_DATA` case needs full implementation; `documentchange` listener needs to be added at top level
- `App.tsx` needs to be replaced entirely with the two-tab UI (it's currently a debug scaffold)
- Sandbox must receive `INJECT_DATA` message, run audit internally, chunk the result, write via `setPluginData`, then post `INJECT_COMPLETE` or `INJECT_ERROR` back to UI

</code_context>

<specifics>
## Specific Ideas

- "Simplicidad brutal" — the designer should open the plugin, press one button, and be done; zero configuration required for the happy path
- Success indicator should feel like a clear green checkmark + "Ready for Trae/Cursor" — confident, unambiguous
- The AI Context tab is a power-user tab; it should not distract from the primary Audit tab flow

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-data-injection-plugin-ui*
*Context gathered: 2026-03-03*
