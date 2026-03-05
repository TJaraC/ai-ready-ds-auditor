# Phase 3: Data Injection & Plugin UI - Research

**Researched:** 2026-03-03
**Domain:** Figma Plugin API (setPluginData, documentchange), React UI (inline styles, CSS variables, two-tab layout)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Injection Flow**
- Single combined CTA: one "Audit & Inject" button kicks off the full flow (scan → dashboard → inject)
- After scan completes, dashboard appears with metrics; a second prominent button "Inject AI Context" saves the chunked JSON to the Figma file
- Success state shows "✅ Ready for Trae/Cursor" after successful injection
- Priority: brutal simplicity — the designer should never need to understand chunking or JSON internals

**Health Dashboard Layout**
- 4 stat cards in a 2×2 grid above the issue list: Tokens, Components, Total Issues, Health Score
- Issue list below the grid: grouped by category (Color / Typography / Spacing / Components), each group is a collapsible section with issue count badge
- Each issue row: node name + offending value (e.g., "Button/Primary — #FF5733"); clicking a row navigates the canvas to that node (SELECT_NODE already wired)
- Initial / first-run state: welcome screen with only the large "Audit & Inject" button centered — no empty placeholders or instructions

**Out of Sync Indicator**
- A banner (red/amber) appears at the top of the "Audit" tab when data is stale: "⚠️ AI Context may be outdated — Re-inject to update"
- Detection mechanism: `figma.on('documentchange')` filtering events that affect components, styles, or variables (not every small edit)
- The banner contains an inline "Re-inject" button that triggers the full Audit & Inject flow directly — no need to scroll to the main CTA

**AI Context Tab**
- Tab names: **"Audit"** (primary) and **"AI Context"** (secondary)
- CSS framework selector: native `<select>` dropdown (Tailwind CSS, CSS Variables, CSS Modules, Styled Components)
- File ID section: read-only text field showing the Figma File ID + "Copy" button + a pre-formatted JSON snippet showing exactly how to add it to mcp.json for Trae/Cursor — reduces MCP setup friction to copy-paste

### Claude's Discretion
- Exact color palette and typography for the plugin UI (should feel native to Figma's design language)
- Animation/transition details for collapsible sections and progress feedback during scan
- Exact chunking implementation details (TextEncoder byte counting, key naming)
- Error message copy for injection failures (file permission errors, chunk write failures)
- Loading skeleton or spinner style during the scan phase

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Audit results serialized to JSON and injected via `figma.root.setPluginData()` | setPluginData API confirmed on DocumentNode; clear via empty string |
| DATA-02 | JSON >90kB split into chunks stored under `ai_data_1`, `ai_data_2`, etc. | TextEncoder byte counting pattern documented; 100kB/entry limit confirmed |
| DATA-03 | Metadata key `ai_data_meta` stores chunk count, total byte size, schema version, last-updated timestamp | AuditMeta type already defined in shared/types.ts; JSON.stringify to store |
| DATA-04 | Before writing new chunks, all existing `ai_data_*` keys cleared to prevent stale corruption | getPluginDataKeys() + setPluginData(key, "") pattern confirmed |
| DATA-05 | Chunk sizes measured using TextEncoder for byte-accurate counting | TextEncoder API available in Figma plugin UI context (browser-based) and sandbox (ES2019 target confirmed available) |
| DATA-06 | Plugin listens to `figma.on("documentchange")` with 2-second debounce | documentchange event confirmed; batched by Figma already; manual debounce with setTimeout still needed |
| DATA-07 | Relevant changes (component/style/variable modifications) trigger sync-outdated message to UI | 6 change types documented; CRITICAL: variable changes NOT in documentchange — use style/create/delete/property_change |
| DATA-08 | UI displays visual "Out of Sync" indicator when data is outdated since last injection | Banner with SYNC_OUTDATED message type already in messages.ts; needs React state to show/hide banner |
| UI-01 | Plugin has two tabs: "Audit & Inject" and "AI Context" | React useState tab switcher; no library needed |
| UI-02 | "Audit & Inject" tab shows health dashboard: total components, tokens, issue count by category, overall health score | AuditReport.summary already has all fields; 2×2 grid layout in 320px window |
| UI-03 | "Audit & Inject" tab has primary "Inject / Update" button triggering full scan and data injection | INJECT_DATA message type exists; START_SCAN then INJECT_DATA sequence |
| UI-04 | Each audit issue clickable and navigates Figma canvas to offending node | SELECT_NODE handler already wired in code.ts |
| UI-05 | "AI Context" tab has CSS framework selector: Tailwind CSS, CSS Variables, CSS Modules, Styled Components/Emotion | Native `<select>` element; no external library |
| UI-06 | "AI Context" tab has button to export injected JSON to local file | Browser anchor+blob download trick from plugin UI iframe; no filesystem API needed |
| UI-07 | "AI Context" tab displays Figma File ID and metadata fields for MCP server configuration | figma.fileKey only available to private plugins; use figma.root.name as display identifier; user must supply file key manually |
| UI-08 | All async operations show clear loading states | React useState for loading boolean; inline spinner or animated ellipsis |
| UI-09 | All error conditions show clear, actionable error messages | React useState for error string; display inline below action that failed |
| UI-10 | Plugin UI bundle size stays under 200kB gzipped | No new heavy dependencies; inline styles only; vite-plugin-singlefile already configured |
</phase_requirements>

---

## Summary

Phase 3 has two primary concerns: (1) implementing the `INJECT_DATA` handler in the sandbox with TextEncoder-based chunked writes via `setPluginData`, and (2) replacing the debug `App.tsx` scaffold with a production two-tab React UI. Both are well-bounded by the existing codebase — the types, message protocol, and constants are already defined; this phase fills in the implementations.

The Figma Plugin API surface needed is straightforward: `figma.root.setPluginData(key, value)` / `figma.root.getPluginDataKeys()` for injection, and `figma.on("documentchange", handler)` for change detection. The critical pitfall is that **variable changes are not emitted by the documentchange event** — only node property changes and style changes are. The CONTEXT.md says to filter for "components/styles/variables" changes, but variables will be silently missed. The correct implementation should filter for component creation/deletion/property changes and style changes, and document this limitation for the user.

The UI must run entirely within a 320×480px iframe with inline styles only (the existing Vite + vite-plugin-singlefile setup bundles everything into ui.html). Figma provides CSS custom properties (`--figma-color-bg`, `--figma-color-text`, etc.) that update automatically with light/dark theme changes when `themeColors: true` is passed to `figma.showUI()`. However, since the project currently uses inline styles only (no CSS files), CSS variables must be accessed via JavaScript string values or a thin CSS reset in the HTML `<style>` block. The File ID (UI-07) cannot be obtained from `figma.fileKey` in a community plugin — use `figma.root.name` as a display label and instruct users to copy it from the Figma URL.

**Primary recommendation:** Implement the injection logic as a pure TypeScript function in `packages/plugin/src/sandbox/inject.ts` (testable without Figma runtime), wire it into the `INJECT_DATA` case in `code.ts`, then build the React UI as a flat component tree with `useState` state machine managing the tab, scan phase, and injection phase — no external state library.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 (already installed) | UI component tree, state management | Already in the project; functional components + hooks |
| TypeScript strict | Already configured | Type safety across UI and sandbox | Project convention; strict mode enforced |
| Figma Plugin Typings | ^1.123.0 (already installed) | `setPluginData`, `figma.on`, `DocumentNode` types | Required for sandbox TypeScript |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TextEncoder | Web API (built-in) | Byte-accurate UTF-8 counting for chunk sizing | DATA-02, DATA-05: use `new TextEncoder().encode(str).length` |
| figma.root.setPluginData | Figma Plugin API | Store chunked JSON in the document | DATA-01 through DATA-04 |
| figma.root.getPluginDataKeys | Figma Plugin API | List all keys to clear before re-injection | DATA-04: avoid stale chunk corruption |
| figma.on("documentchange") | Figma Plugin API | Detect document changes for staleness | DATA-06, DATA-07 |
| Figma CSS variables | `themeColors: true` | Native Figma color palette in plugin UI | UI color system: `--figma-color-bg`, `--figma-color-text`, etc. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TextEncoder byte counting | Character count (.length) | Characters ≠ bytes for multi-byte Unicode; DATA-05 explicitly requires TextEncoder |
| inline styles + Figma CSS vars | External CSS file | External CSS would need a CSS module config change; current vite-plugin-singlefile setup already inlines `<style>` tags in the HTML head, so a `<style>` in ui.html is the path of least resistance |
| useState state machine | Redux/Zustand | No need for external state; plugin UI has simple linear states (idle → scanning → injecting → done) |
| DocumentNode (figma.root) for data storage | FrameNode or ComponentNode | figma.root is accessible regardless of page; correct location for file-level data |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/plugin/src/
├── sandbox/
│   ├── code.ts                 # INJECT_DATA case: call injectReport(); add documentchange listener
│   ├── inject.ts               # NEW: injectReport(report) — chunking logic, pure function testable without Figma
│   └── audit/
│       ├── index.ts            # runAudit() orchestrator (Phase 2 — complete)
│       └── utils.ts            # assembleReport, buildIssue (Phase 2 — complete)
└── ui/
    ├── ui.html                 # HTML entry: add `themeColors` to showUI call in code.ts; keep `<style>` block for CSS vars
    ├── index.tsx               # React entry point (no changes needed)
    └── App.tsx                 # REPLACE entirely with two-tab production UI
        └── (or decompose into components: AuditTab.tsx, AIContextTab.tsx, StatCard.tsx, IssueGroup.tsx)
```

### Pattern 1: Chunked Injection Function (Sandbox — ES2019 target)

**What:** Pure function that serializes an `AuditReport` and writes it to `figma.root` as multiple plugin data keys.
**When to use:** Called from the `INJECT_DATA` handler in `code.ts` after `runAudit()` completes.

```typescript
// packages/plugin/src/sandbox/inject.ts
import type { AuditReport, AuditMeta } from '@shared/types';
import { CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES } from '@shared/constants';

export interface InjectionResult {
  chunkCount: number;
  bytesWritten: number;
}

export function injectReport(report: AuditReport): InjectionResult {
  const json = JSON.stringify(report);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  const totalBytes = bytes.length;

  // Step 1: Clear all existing ai_data_* keys to prevent stale corruption (DATA-04)
  const existingKeys = figma.root.getPluginDataKeys();
  for (const key of existingKeys) {
    if (key.startsWith(CHUNK_KEY_PREFIX) || key === META_KEY) {
      figma.root.setPluginData(key, '');  // Empty string = delete (DATA-04)
    }
  }

  // Step 2: Split into chunks by byte boundary (DATA-02, DATA-05)
  // Note: TextEncoder encodes as UTF-8; slice bytes then decode back to string
  const chunks: string[] = [];
  let offset = 0;
  while (offset < totalBytes) {
    const sliceEnd = Math.min(offset + MAX_CHUNK_BYTES, totalBytes);
    const chunk = bytes.slice(offset, sliceEnd);
    chunks.push(new TextDecoder().decode(chunk));
    offset = sliceEnd;
  }

  // Step 3: Write chunks (DATA-02)
  chunks.forEach((chunk, index) => {
    figma.root.setPluginData(`${CHUNK_KEY_PREFIX}${index + 1}`, chunk);
  });

  // Step 4: Write metadata (DATA-03)
  const meta: AuditMeta = {
    schemaVersion: report.schemaVersion,
    chunkCount: chunks.length,
    totalBytes,
    fileId: report.fileId,
    fileName: report.fileName,
    scannedAt: report.scannedAt,
    checksum: '',  // Phase 3 — simple implementation; checksum can be empty string or sum of bytes
  };
  figma.root.setPluginData(META_KEY, JSON.stringify(meta));

  return { chunkCount: chunks.length, bytesWritten: totalBytes };
}
```

**Important:** Verify that slicing UTF-8 bytes and re-decoding preserves valid UTF-8 boundaries. A safe alternative is to split the JSON _string_ by character count with a conservative bound (90,000 chars ≈ 90,000 bytes for ASCII-dominant JSON). For safety, use the byte-slice approach above since the spec requires TextEncoder (DATA-05).

### Pattern 2: documentchange Listener with Debounce (Sandbox)

**What:** Listens for document changes and sends `SYNC_OUTDATED` to UI after relevant changes.
**When to use:** Added at the top level of `code.ts`, runs throughout the plugin session.

```typescript
// In code.ts — add after figma.ui.onmessage assignment

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

figma.on('documentchange', (event) => {
  // Filter: only care about changes to nodes (create/delete/property) and styles
  // NOTE: Figma documentchange does NOT fire for variable changes (known API limitation)
  const relevant = event.documentChanges.some((change) =>
    change.type === 'CREATE' ||
    change.type === 'DELETE' ||
    change.type === 'PROPERTY_CHANGE' ||
    change.type === 'STYLE_CREATE' ||
    change.type === 'STYLE_DELETE' ||
    change.type === 'STYLE_PROPERTY_CHANGE'
  );

  if (!relevant) return;

  // Debounce: wait 2 seconds after the last change (DATA-06)
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    const msg: SandboxMessage = {
      type: 'SYNC_OUTDATED',
      lastScannedAt: new Date().toISOString(),
    };
    figma.ui.postMessage(msg);
    debounceTimer = null;
  }, 2000);
});
```

### Pattern 3: Two-Tab React UI State Machine (UI)

**What:** Single `App.tsx` with a tab state and a phase state machine for scan/inject flow.
**When to use:** The entire App.tsx replacement.

```typescript
// packages/plugin/src/ui/App.tsx — top-level state shape
type Tab = 'audit' | 'ai-context';
type Phase = 'idle' | 'scanning' | 'injecting' | 'complete' | 'error';

interface AppState {
  tab: Tab;
  phase: Phase;
  report: AuditReport | null;
  isOutOfSync: boolean;
  errorMessage: string | null;
  cssFramework: 'tailwind' | 'css-variables' | 'css-modules' | 'styled-components';
}
```

Message handling: keep the existing `window.addEventListener('message', handleMessage)` pattern. Map each `SandboxMessage` type to state transitions:
- `SCAN_PROGRESS` → update progress indicator
- `SCAN_COMPLETE` → set `report`, transition phase to `injecting` (auto-trigger inject), OR wait for user to press "Inject AI Context"
- `INJECT_COMPLETE` → phase = `'complete'`, isOutOfSync = false
- `INJECT_ERROR` → phase = `'error'`, errorMessage = msg.message
- `SYNC_OUTDATED` → isOutOfSync = true (show banner)

### Pattern 4: Export JSON via Anchor Blob (UI)

**What:** Trigger a file download from the plugin iframe for UI-06 (export JSON to local file).
**When to use:** User clicks "Export JSON" in AI Context tab.

```typescript
// In the AI Context tab component
function downloadJson(report: AuditReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.fileName ?? 'design-system'}-audit.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

Source: Standard browser download pattern. Works in Figma plugin iframes (browser-based UI thread). No filesystem API required.

### Pattern 5: Figma CSS Variables in Inline-Style Context

**What:** Use `themeColors: true` in `figma.showUI()` and reference Figma's CSS variables in a `<style>` block in `ui.html`.
**When to use:** Everywhere — provides native Figma dark/light theme support.

In `code.ts`, update `figma.showUI`:
```typescript
figma.showUI(__html__, { width: 320, height: 480, themeColors: true });
```

In `ui.html` `<style>` block, add base styles that use Figma's CSS variables:
```css
:root {
  /* Figma tokens — automatically injected as CSS vars when themeColors: true */
}
body {
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 11px;
}
```

For inline styles in React components that need Figma's accent color, use the CSS variable string directly in the style object:
```typescript
// Figma's blue accent color for buttons
const btnStyle: React.CSSProperties = {
  backgroundColor: 'var(--figma-color-bg-brand)',
  color: 'var(--figma-color-text-onbrand)',
};
```

### Anti-Patterns to Avoid

- **Slicing JSON by character count instead of byte count:** Multi-byte Unicode characters can cause byte overruns. Always use `TextEncoder` (DATA-05).
- **Using figma.fileKey in a community plugin:** This property is `undefined` for all community plugins. Only private plugins with `enablePrivatePluginApi: true` in their manifest have access. See the File ID section below.
- **Listening for variable changes via documentchange:** Variables are NOT in the documentchange event type union. The API limitation is documented and unresolved (as of 2025). Do not wait for variable events; document this limitation in user-facing copy.
- **Not clearing old chunks before writing new ones:** If a previous injection wrote 5 chunks and the new audit needs only 2, chunks 3–5 remain, corrupting the MCP server's reconstruction. Always call `getPluginDataKeys()` and clear `ai_data_*` before writing (DATA-04).
- **Importing heavy UI libraries:** No Radix, no Tailwind (in the UI bundle), no shadcn — inline styles only, per the existing project constraint. The 200kB gzip limit (UI-10) is easily breached with component libraries.
- **Triggering re-render on every documentchange event:** The callback fires frequently. Debounce for 2 seconds (DATA-06) before sending SYNC_OUTDATED to the UI.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Byte-accurate string splitting | Custom UTF-8 byte counter | `new TextEncoder().encode(str).length` | Web standard API, handles all Unicode correctly |
| File download from browser context | Custom XHR or service worker | Anchor + Blob + `URL.createObjectURL` | Standard browser pattern, works in Figma iframe |
| Theme-aware colors in plugin UI | Hard-coded hex values | Figma CSS variables (`--figma-color-bg` etc.) with `themeColors: true` | Automatically switches for light/dark; Figma maintains the values |
| State management | Redux, Zustand, MobX | React `useState` + `useReducer` | Phase scope is well-bounded; external library costs bundle size |
| Tab UI component | External tab library | React `useState` + conditional render | 320px window; inline styles only; any library adds bundle weight |

**Key insight:** The Figma Plugin API and browser Web APIs together provide everything this phase needs — no npm installs required beyond what's already present.

---

## Common Pitfalls

### Pitfall 1: figma.fileKey Returns undefined in Community Plugins

**What goes wrong:** `figma.fileKey` is `undefined` for all community plugins. Using it as the file identifier in the MCP setup display (UI-07) will show "undefined".
**Why it happens:** Figma restricts this property to private plugins and Figma-owned widgets only. Requires `enablePrivatePluginApi: true` in manifest, which blocks Figma Community submission.
**How to avoid:** Display `figma.root.name` (the document name) as the "File Name" and instruct users to copy the File Key from the Figma URL (format: `figma.com/design/{FILE_KEY}/...`). The mcp.json snippet in the AI Context tab should show a placeholder like `"YOUR_FILE_KEY_FROM_URL"` with clear instructions.
**Warning signs:** Any reference to `figma.fileKey` in sandbox code without `enablePrivatePluginApi`.

### Pitfall 2: Variable Changes Are Invisible to documentchange

**What goes wrong:** CONTEXT.md says to filter for "components/styles/variables" changes. Figma's `documentchange` API does not emit events for variable create/delete/modify operations. Variable changes will not trigger the stale banner.
**Why it happens:** Figma has not yet added variable change events to the documentchange type union. This has been a known limitation since variables entered beta.
**How to avoid:** Filter only for the six documented change types (`CREATE`, `DELETE`, `PROPERTY_CHANGE`, `STYLE_CREATE`, `STYLE_DELETE`, `STYLE_PROPERTY_CHANGE`). Document in the UI that "Variable changes may not trigger the sync indicator — re-inject after updating variable collections."
**Warning signs:** Filtering for a `'VARIABLE_CHANGE'` type that doesn't exist (TypeScript will catch this if types are checked).

### Pitfall 3: UTF-8 Byte Boundary Splits Produce Invalid JSON Chunks

**What goes wrong:** Slicing raw UTF-8 bytes at chunk boundaries can split a multi-byte character (e.g., an emoji or CJK character) mid-sequence, producing invalid UTF-8 in a chunk.
**Why it happens:** A 4-byte Unicode character starting at byte 89,999 would be split at byte 90,000, putting 1 byte in one chunk and 3 in the next. Neither chunk decodes correctly.
**How to avoid:** For this project's use case (JSON with ASCII-dominant content — hex colors, node names, ISO dates), this is unlikely to occur. But to be safe: (a) keep `MAX_CHUNK_BYTES = 90,000` well below the 100kB limit, giving 10kB headroom, and (b) consider splitting by character count rather than byte count (90,000 chars × max 4 bytes/char = 360KB theoretical max per chunk, but in practice JSON is mostly ASCII so actual bytes ≈ char count). The simplest correct approach: split the JSON string into 88,000-character chunks (conservative bound that guarantees byte count stays under 90kB for typical JSON content).
**Warning signs:** MCP server failing to `JSON.parse` a reconstructed chunk in Phase 4.

### Pitfall 4: Stale Chunks After Re-injection

**What goes wrong:** Previous injection wrote N chunks. New injection writes M < N chunks. Chunks M+1 through N remain, causing MCP server to read extra garbage chunks.
**Why it happens:** `setPluginData(key, value)` only sets or creates; it never automatically removes old keys.
**How to avoid:** Before writing new chunks, call `figma.root.getPluginDataKeys()`, filter for keys matching `ai_data_*`, and set each to `""` (empty string = deletion). Also delete `ai_data_meta` and rewrite it last.
**Warning signs:** MCP server reads more chunks than `meta.chunkCount` indicates, or reconstruction produces truncated/corrupted JSON.

### Pitfall 5: INJECT_DATA Message Triggers Scan Before report Is Available

**What goes wrong:** Current messages.ts has `INJECT_DATA` as a message from UI to sandbox with no payload. If the sandbox calls `runAudit()` inside the INJECT_DATA handler, it duplicates scan work. If the UI sends INJECT_DATA before SCAN_COMPLETE arrives, there is no report to inject.
**Why it happens:** The flow is: button click → START_SCAN → SCAN_COMPLETE → button click → INJECT_DATA. The sandbox needs to run the full scan inside INJECT_DATA, not rely on a previously stored report (sandbox has no persistent state between messages).
**How to avoid:** The INJECT_DATA handler in code.ts should call `runAudit()` followed immediately by `injectReport()`. This is the single combined flow: scan + inject in one atomic operation. The UI button triggers a single `INJECT_DATA` message and displays a combined "Scanning... / Injecting..." loading state.
**Warning signs:** Sending `START_SCAN` first and then `INJECT_DATA` and expecting the sandbox to remember the report between two separate message handlers.

### Pitfall 6: Bundle Size Creep from React UI Components

**What goes wrong:** UI-10 requires <200kB gzipped. React 19 + ReactDOM are already the bulk. Adding any icon library, animation library, or component kit could push the bundle over the limit.
**Why it happens:** vite-plugin-singlefile inlines everything (JS, CSS, fonts) into a single HTML file. External libraries add directly to the inline size.
**How to avoid:** Use inline styles only (existing project constraint). Use Unicode characters for icons ("✅", "⚠️", "▼", "▶") rather than an SVG icon library. No CSS framework imports. Verify with `npm run build` and check `dist/ui.html` file size after each major addition.
**Warning signs:** `dist/ui.html` growing beyond ~600kB raw (rough estimate: 600kB raw ≈ 200kB gzip).

---

## Code Examples

Verified patterns from official sources:

### Clearing All Plugin Data Keys Before Re-injection

```typescript
// Source: developers.figma.com/docs/plugins/api/properties/nodes-setplugindata/
// (setting value to "" removes the key)

const existingKeys = figma.root.getPluginDataKeys();
for (const key of existingKeys) {
  if (key.startsWith('ai_data_')) {
    figma.root.setPluginData(key, '');
  }
}
```

### documentchange with Change Type Filtering

```typescript
// Source: developers.figma.com/docs/plugins/api/properties/figma-on/
// DocumentChange types: 'CREATE' | 'DELETE' | 'PROPERTY_CHANGE' |
//                       'STYLE_CREATE' | 'STYLE_DELETE' | 'STYLE_PROPERTY_CHANGE'
// NOTE: Variable changes are NOT included — known Figma API limitation.

figma.on('documentchange', (event) => {
  const hasRelevantChange = event.documentChanges.some(
    (change) =>
      change.type === 'CREATE' ||
      change.type === 'DELETE' ||
      change.type === 'PROPERTY_CHANGE' ||
      change.type === 'STYLE_CREATE' ||
      change.type === 'STYLE_DELETE' ||
      change.type === 'STYLE_PROPERTY_CHANGE'
  );
  if (hasRelevantChange) {
    // ... debounce and notify UI
  }
});
```

### Figma themeColors CSS Variables Setup

```typescript
// Source: developers.figma.com/docs/plugins/css-variables/
// In code.ts (sandbox):
figma.showUI(__html__, { width: 320, height: 480, themeColors: true });

// Available CSS variables (subset):
// --figma-color-bg            Main background
// --figma-color-bg-secondary  Panel/card backgrounds
// --figma-color-bg-brand      Button backgrounds (Figma blue)
// --figma-color-text          Primary text
// --figma-color-text-secondary Secondary text / labels
// --figma-color-text-tertiary  Placeholder text
// --figma-color-text-onbrand   Text on branded backgrounds (white)
// --figma-color-text-danger    Error text (red)
// --figma-color-border         Dividers
// --figma-color-border-strong  Strong borders
// --figma-color-bg-danger      Error background (red tint)
```

### React Collapsible Section (Inline Styles Only)

```typescript
// No external library — pure useState toggle
function IssueGroup({
  category,
  issues,
  onSelectNode,
}: {
  category: string;
  issues: AuditIssue[];
  onSelectNode: (nodeId: string) => void;
}): React.ReactElement {
  const [open, setOpen] = React.useState(true);

  return (
    <div style={{ borderBottom: '1px solid var(--figma-color-border)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--figma-color-text)',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        <span>{category}</span>
        <span style={{ /* badge */ }}>
          {issues.length}
          {open ? ' ▼' : ' ▶'}
        </span>
      </button>
      {open && issues.map((issue) => (
        <button
          key={issue.id}
          onClick={() => onSelectNode(issue.nodeId)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '4px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--figma-color-text-secondary)',
            fontSize: '11px',
          }}
        >
          {issue.nodeName} — {issue.offendingValue}
        </button>
      ))}
    </div>
  );
}
```

### 2×2 Stat Card Grid in 320px Window

```typescript
// 320px total width, 8px padding each side → 304px content width
// 4 cards in 2×2: each card ≈ 144px wide with 8px gap
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  padding: '8px',
  margin: '8px',
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--figma-color-bg-secondary)',
      borderRadius: '6px',
      padding: '10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--figma-color-text)' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--figma-color-text-secondary)', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-coded hex colors in plugin UI (`#18A0FB`, `#FFFFFF`) | Figma CSS variables (`--figma-color-bg-brand`) | 2022 (themeColors API) | Automatic dark/light mode support; survives Figma theme changes |
| Character count for chunk size | `TextEncoder().encode(str).length` (byte count) | Always best practice | Required for non-ASCII content safety |
| `figma.fileKey` assumed available | Only available in private plugins; community plugins get `undefined` | Documented since plugin API v1 | Community plugins must display file name and instruct users to get file key from URL |
| `console.log` in sandbox | All sandbox logs visible only in Figma Desktop console | Not changed | Debugging: open Figma Desktop > Plugins > Development > Show console |

**Deprecated/outdated:**
- Direct character count for byte measurement: never reliable for multi-byte characters; always use TextEncoder.
- Hardcoded Figma brand colors: `#18A0FB` still works but bypasses light/dark theme switching.

---

## Open Questions

1. **TextEncoder availability in the Figma sandbox (ES2019 target)**
   - What we know: TextEncoder is a Web API available in browser contexts. The Figma plugin sandbox is a restricted JS environment, not a full browser.
   - What's unclear: Whether TextEncoder is available in the sandbox (code.ts) context under the ES2019 build target.
   - Recommendation: Keep the chunking logic in a separate `inject.ts` that only runs in the sandbox. If TextEncoder is unavailable in sandbox, implement chunking in the UI thread instead (UI has full browser APIs), sending the pre-chunked data to the sandbox via `INJECT_DATA` message with chunks as payload. Alternatively: do character-count splitting in sandbox (90,000 chars conservative bound) and accept the slight byte-vs-char approximation.

2. **figma.root.getPluginDataKeys() — does it include keys set by other plugin instances?**
   - What we know: `setPluginData` is plugin-ID scoped; `getPluginDataKeys()` returns only this plugin's keys.
   - What's unclear: Whether the behavior is documented for the case where the same plugin is published to multiple IDs (development vs. production manifest IDs).
   - Recommendation: This is not a concern for Phase 3. Document it as a potential Phase 5 polish item.

3. **UI-07: File ID display when figma.fileKey is unavailable**
   - What we know: `figma.fileKey` is undefined in community plugins. The file name is available as `figma.root.name`. The actual file key is embedded in the Figma URL.
   - What's unclear: Whether the CONTEXT.md "File ID section" means the actual Figma file key (from URL) or just a display identifier.
   - Recommendation: Display `figma.root.name` as "File Name" and show instructional text: "Get your File Key from the Figma URL: figma.com/design/**{FILE_KEY}**/..." with a placeholder in the mcp.json snippet. This is the only viable approach for a community plugin.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.figma.com/docs/plugins/api/properties/nodes-setplugindata/` — setPluginData parameters, 100kB per-entry limit, empty string deletion
- `https://developers.figma.com/docs/plugins/api/properties/figma-on/` — documentchange event, DocumentChange type union (6 types), batching behavior
- `https://developers.figma.com/docs/plugins/api/DocumentChange/` — Full DocumentChange type details with all 6 variants
- `https://developers.figma.com/docs/plugins/css-variables/` — themeColors option, Figma CSS variable names, dark/light theme support
- `https://developers.figma.com/docs/plugins/api/figma/` — figma.fileKey: only available in private plugins with enablePrivatePluginApi
- Project source files: `packages/shared/src/{types,messages,constants}.ts`, `packages/plugin/src/sandbox/code.ts`, `packages/plugin/src/sandbox/audit/index.ts`

### Secondary (MEDIUM confidence)
- `https://forum.figma.com/ask-the-community-7/documentchange-events-don-t-support-variables-28697` — Variables not supported by documentchange (corroborated by official type union having no variable change types)
- `https://forum.figma.com/report-a-problem-6/setplugindata-100kb-size-limit-now-being-enforced-38987` — 100kB limit enforced (corroborated by official docs)
- Tokens Studio for Figma chunking implementation — community reference for chunking pattern with multiple keys

### Tertiary (LOW confidence)
- Figma plugin UI color values (`11px font-size`, `Inter` font, hover/focus patterns) — extrapolated from Evil Martians article and CSS variables documentation; official Figma plugin design guidelines document not found

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; Figma APIs confirmed via official docs
- Architecture: HIGH — existing code structure (code.ts, messages.ts, types.ts) well-understood; patterns derived from confirmed APIs
- Pitfalls: HIGH — fileKey limitation and variable change gap confirmed via official docs; chunk clearing pattern confirmed via official setPluginData docs
- File ID display (UI-07): MEDIUM — workaround via `figma.root.name` + URL instruction is the known community pattern; not officially documented as "the recommended approach" but is the only viable path

**Research date:** 2026-03-03
**Valid until:** 2026-06-03 (90 days — Figma Plugin API is stable; CSS variables feature is stable since 2022)
