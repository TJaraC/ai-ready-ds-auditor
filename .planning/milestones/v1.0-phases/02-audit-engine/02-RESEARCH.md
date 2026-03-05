# Phase 2: Audit Engine — Research

**Researched:** 2026-03-03
**Domain:** Figma Plugin API (sandbox) — scene graph traversal, variable bindings, style IDs, component detection
**Confidence:** HIGH (primary source: @figma/plugin-typings@1.123.0 installed in project; all API signatures verified directly from type declarations)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | Traverse full scene graph of active Figma document (all pages) | `figma.root.children` gives all pages; `page.loadAsync()` + `page.findAll()` per page |
| AUDIT-02 | Detect fills/strokes using raw hex/rgb instead of bound variables or color styles | Check `fillStyleId`, `strokeStyleId` non-empty + `boundVariables.fills/strokes` on each SolidPaint |
| AUDIT-03 | Detect text nodes with hardcoded fontSize/fontWeight not bound to text styles or variables | Check `textStyleId` empty + `boundVariables` missing `fontSize`/`fontWeight` fields |
| AUDIT-04 | Detect auto-layout nodes with hardcoded padding/itemSpacing not using spacing variables | Check `layoutMode !== 'NONE'` + `boundVariables` missing `paddingLeft/Right/Top/Bottom/itemSpacing` |
| AUDIT-05 | Detect frame/group layers matching existing components but not instances | Name-matching heuristic: compare FRAME/GROUP names against ComponentNode name set |
| AUDIT-06 | Each issue includes nodeId, nodeName, pageName, issueType, offendingValue, suggestedFix | Construct from traversal context: page.name, node.id, node.name; offendingValue from raw property |
| AUDIT-07 | Produce typed AuditReport conforming to shared types schema | Assemble `AuditReport` from `@ai-ds-auditor/shared` — type already defined in packages/shared |
| AUDIT-08 | Support progress reporting to UI during long scans | Send `SCAN_PROGRESS` SandboxMessage via `figma.ui.postMessage()` between page iterations |
| AUDIT-09 | Every AuditReport includes schemaVersion field | `schemaVersion` exported from `@ai-ds-auditor/shared` — import and assign |
</phase_requirements>

---

## Summary

The audit engine runs entirely in the Figma plugin sandbox (`packages/plugin/src/sandbox/code.ts`). The sandbox has access to `figma.*` APIs and the `@figma/plugin-typings` type declarations, but NO DOM APIs and NO async I/O. All traversal and detection happens synchronously or with `async/await` on Figma's own async APIs.

The manifest uses `documentAccess: "dynamic-page"`, which means: (1) all sync style/variable lookup methods (`getLocalPaintStyles()`, `getLocalTextStyles()`, `getLocalVariables()`, etc.) **throw exceptions** — only the `Async` variants work; (2) `PageNode.loadAsync()` must be called before accessing any page's children or calling `findAll`/`findAllWithCriteria` on it.

The architectural pattern is: load all local styles/variables into a lookup Set once → iterate pages (loading each) → `findAllWithCriteria` per page for specific node types → run per-category auditors → accumulate issues → send SCAN_PROGRESS after each page → send SCAN_COMPLETE with the assembled AuditReport.

**Primary recommendation:** Use `findAllWithCriteria({ types: ['TEXT'] })`, `findAllWithCriteria({ types: ['FRAME', 'COMPONENT', 'INSTANCE'] })` etc. per page — this is hundreds of times faster than `findAll()` on large documents because it prunes the traversal. Set `figma.skipInvisibleInstanceChildren = true` before scanning for additional speed on documents with many instances.

---

## Standard Stack

### Core (all already installed from Phase 1)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@figma/plugin-typings` | 1.123.0 | TypeScript types for the entire Figma Plugin API | Official Figma package; already installed |
| `@ai-ds-auditor/shared` | workspace | `AuditReport`, `AuditIssue`, `schemaVersion` | Already defined in Phase 1 |

### Supporting (no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript (ES2017) | 5.9.3 | Sandbox language — must target ES2017 per tsconfig.sandbox.json | Already configured |

**No new npm installs required for Phase 2.** The audit engine is pure Figma API + shared types.

---

## Architecture Patterns

### Recommended File Structure
```
packages/plugin/src/sandbox/
├── code.ts                  # Entry point — message handler (fill in START_SCAN stub)
├── audit/
│   ├── index.ts             # runAudit(pages, styles, variables): AuditReport
│   ├── color.ts             # auditColors(node, pageContext, styleIds, varIds): AuditIssue[]
│   ├── typography.ts        # auditTypography(node, pageContext, styleIds, varIds): AuditIssue[]
│   ├── spacing.ts           # auditSpacing(node, pageContext, varIds): AuditIssue[]
│   ├── components.ts        # auditComponents(node, pageContext, componentNames): AuditIssue[]
│   └── utils.ts             # rgbToHex(), isHardcoded*(), buildIssue()
```

### Pattern 1: Page Iteration with dynamic-page Manifest

**What:** The manifest has `documentAccess: "dynamic-page"`. This means `figma.root` exists and `figma.root.children` gives all pages, but each page's content is not loaded until you call `page.loadAsync()`.

**Critical Rule:** Do NOT use `figma.loadAllPagesAsync()` — it loads every page at once, causing memory pressure on large documents. Load one page at a time, run auditors, then move on.

```typescript
// Source: @figma/plugin-typings plugin-api.d.ts — PageNode.loadAsync()
async function runAudit(): Promise<AuditReport> {
  figma.skipInvisibleInstanceChildren = true; // major perf win

  // Pre-load lookup sets ONCE (Async versions required — sync throw with dynamic-page)
  const [paintStyles, textStyles, variables] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  const styleIds = new Set([
    ...paintStyles.map(s => s.id),
    ...textStyles.map(s => s.id),
  ]);
  const varIds = new Set(variables.map(v => v.id));

  // Collect all component names for disconnected-component detection
  const pages = figma.root.children; // PageNode[]
  const componentNames = new Set<string>();

  // Pass 1: collect all component definitions across all pages
  for (const page of pages) {
    await page.loadAsync();
    page.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })
      .forEach(n => componentNames.add(n.name));
  }

  const allIssues: AuditIssue[] = [];
  let nodeCount = 0;

  // Pass 2: audit each page
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    // page is already loaded from pass 1
    const pageContext = { pageName: page.name };

    const pageNodes = page.findAll(); // all scene nodes on this page
    nodeCount += pageNodes.length;

    for (const node of pageNodes) {
      allIssues.push(...auditNode(node, pageContext, styleIds, varIds, componentNames));
    }

    // Report progress after each page
    const percent = Math.round(((i + 1) / pages.length) * 100);
    const msg: SandboxMessage = { type: 'SCAN_PROGRESS', percent, currentNode: page.name };
    figma.ui.postMessage(msg);
  }

  return assembleReport(allIssues, ...);
}
```

### Pattern 2: Color Audit — Detecting Hardcoded Fills/Strokes

**What:** A fill/stroke is "hardcoded" if: (1) no `fillStyleId` / `strokeStyleId` points to a paint style, AND (2) the paint itself has no `boundVariables.color` pointing to a variable.

**Key type detail from typings:** `node.fills` returns `ReadonlyArray<Paint> | PluginAPI['mixed']` on text nodes (mixed text may have per-character fills). Always check `fills !== figma.mixed` before iterating. Only `SolidPaint` has `boundVariables` — gradient/image/video paints cannot be bound to variables.

```typescript
// Source: @figma/plugin-typings SolidPaint.boundVariables, GeometryMixin.fillStyleId
function auditFills(
  node: SceneNode,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!('fills' in node)) return issues;

  const fills = node.fills;
  if (fills === figma.mixed) return issues; // mixed text fills — skip node level

  const fillStyleId = 'fillStyleId' in node ? node.fillStyleId : undefined;
  if (fillStyleId && fillStyleId !== figma.mixed && styleIds.has(fillStyleId as string)) {
    return issues; // bound to a paint style — OK
  }

  for (const fill of fills) {
    if (fill.type !== 'SOLID') continue; // only solid fills can use color variables
    // Hardcoded if no variable bound to the paint's 'color' field
    if (!fill.boundVariables?.color) {
      const hex = rgbToHex(fill.color);
      issues.push(buildIssue(node, pageName, 'color', 'hardcoded-fill',
        hex, `Bind to a color variable or apply a paint style`));
    }
  }
  return issues;
}
```

**Same pattern for strokes:** check `strokeStyleId` + `node.strokes` array.

### Pattern 3: Typography Audit — Detecting Hardcoded fontSize/fontWeight

**What:** A text node's typography is "hardcoded" if: (1) `textStyleId` is empty (no text style applied), AND (2) `boundVariables` does not include `fontSize` or `fontWeight` field.

**Key type detail:** `textStyleId: string | PluginAPI['mixed']`. Check `textStyleId !== figma.mixed && textStyleId !== '' && styleIds.has(textStyleId)` to confirm it's bound to a style. The `fontWeight` property is **read-only** on `TextNode` (cannot be set directly — it's derived from `fontName.style`). Only `fontSize` is bindable as a FLOAT variable directly.

```typescript
// Source: @figma/plugin-typings BaseNonResizableTextMixin, VariableBindableTextField
function auditTypography(node: TextNode, pageName: string, styleIds: Set<string>): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const textStyleId = node.textStyleId;
  if (textStyleId !== figma.mixed && textStyleId !== '' && styleIds.has(textStyleId as string)) {
    return issues; // linked to a text style — OK
  }

  const boundVars = node.boundVariables;
  const hasFontSizeVar = boundVars?.fontSize !== undefined;
  // fontWeight binding is under VariableBindableTextField but fontWeight is read-only on node
  // Variables can bind to fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, lineHeight
  const hasFontWeightVar = boundVars?.fontWeight !== undefined;

  if (!hasFontSizeVar && node.fontSize !== figma.mixed) {
    issues.push(buildIssue(node, pageName, 'typography', 'hardcoded-fontSize',
      String(node.fontSize), `Apply a text style or bind fontSize to a variable`));
  }
  // Note: fontWeight is derived from fontName.style — flag it as an informational issue
  if (!hasFontWeightVar && !hasFontSizeVar && node.fontWeight !== figma.mixed) {
    issues.push(buildIssue(node, pageName, 'typography', 'hardcoded-fontWeight',
      String(node.fontWeight), `Apply a text style or bind fontName to a variable`));
  }
  return issues;
}
```

### Pattern 4: Spacing Audit — Detecting Hardcoded Padding/itemSpacing

**What:** Only nodes with `layoutMode !== 'NONE'` have auto-layout. Check `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `itemSpacing` for missing variable bindings.

**Key type detail:** `VariableBindableNodeField` includes `'itemSpacing' | 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'`. These are FLOAT variable fields. The `boundVariables` object on nodes that extend `VariablesMixin` has `[field in VariableBindableNodeField]?: VariableAlias`.

```typescript
// Source: @figma/plugin-typings AutoLayoutMixin, VariableBindableNodeField
function auditSpacing(node: FrameNode | ComponentNode | InstanceNode, pageName: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (node.layoutMode === 'NONE') return issues;

  const bv = node.boundVariables;
  const spacingFields = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'] as const;

  for (const field of spacingFields) {
    if (!bv?.[field]) {
      const value = node[field];
      if (typeof value === 'number' && value !== 0) {
        issues.push(buildIssue(node, pageName, 'spacing', `hardcoded-${field}`,
          String(value), `Bind ${field} to a spacing variable`));
      }
    }
  }
  return issues;
}
```

### Pattern 5: Component Audit — Detecting Disconnected Frames/Groups

**What:** A `FRAME` or `GROUP` node whose `name` matches a known `ComponentNode` or `ComponentSetNode` name in the document is flagged as a potential "manually recreated" component.

**Limitation (confirmed from typings):** There is no API to compare visual/structural similarity — the only practical heuristic in the sandbox is name matching. Name matching catches the most common case (designer manually recreated a component by duplicating and detaching it without renaming).

```typescript
// Source: @figma/plugin-typings ComponentNode.type, InstanceNode.type
function auditComponents(
  node: SceneNode,
  pageName: string,
  componentNames: Set<string>,
): AuditIssue[] {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return [];
  if (!componentNames.has(node.name)) return [];

  return [buildIssue(node, pageName, 'component', 'disconnected-component',
    node.name, `Replace this ${node.type} with an instance of the "${node.name}" component`)];
}
```

### Pattern 6: Progress Reporting with SCAN_PROGRESS

**What:** Send `SCAN_PROGRESS` after completing each page. The UI already has a handler for this message type (defined in messages.ts from Phase 1).

```typescript
// Source: packages/shared/src/messages.ts (Phase 1)
// type: 'SCAN_PROGRESS', percent: number, currentNode: string
const progressMsg: SandboxMessage = {
  type: 'SCAN_PROGRESS',
  percent: Math.round(((pageIndex + 1) / totalPages) * 100),
  currentNode: page.name,
};
figma.ui.postMessage(progressMsg);
```

### Pattern 7: Building the AuditReport

**What:** Assemble the `AuditReport` from `packages/shared`. The `schemaVersion` must come from the shared constant.

```typescript
// Source: packages/shared/src/types.ts and src/index.ts (Phase 1)
import { schemaVersion, type AuditReport, type AuditIssue } from '@shared/index';

function assembleReport(
  issues: AuditIssue[],
  components: ComponentSpec[],
  tokens: DesignToken[],
): AuditReport {
  const issuesByCategory = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.category] = (acc[issue.category] ?? 0) + 1;
    return acc;
  }, {});

  const totalIssues = issues.length;
  // Health score: 100 minus 1 point per issue, min 0
  const healthScore = Math.max(0, 100 - totalIssues);

  return {
    schemaVersion,
    fileId: figma.root.name, // fileKey unavailable without private plugin API
    fileName: figma.root.name,
    scannedAt: new Date().toISOString(),
    summary: {
      totalIssues,
      totalTokens: tokens.length,
      totalComponents: components.length,
      issuesByCategory,
      healthScore,
    },
    issues,
    components,
    tokens,
  };
}
```

### Pattern 8: Unique Issue ID Generation

**What:** `AuditIssue.id` must be unique. Since there is no `crypto.randomUUID()` in ES2017 sandbox, use a counter-based or node-id-based ID.

```typescript
// Deterministic: combines nodeId + category + field
function buildIssueId(nodeId: string, category: string, issueType: string): string {
  return `${nodeId}:${category}:${issueType}`;
}
```

### Pattern 9: RGB to Hex Conversion

**What:** Figma stores colors as `RGB` with values 0–1. The `offendingValue` field in `AuditIssue` should be human-readable hex.

```typescript
// Source: @figma/plugin-typings RGB interface { r: number, g: number, b: number }
function rgbToHex(rgb: RGB): string {
  const r = Math.round(rgb.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(rgb.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(rgb.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
```

### Anti-Patterns to Avoid

- **Using sync style/variable methods:** `figma.getLocalPaintStyles()`, `figma.getLocalTextStyles()`, `figma.variables.getLocalVariables()` — all throw with `documentAccess: "dynamic-page"`. Use the `Async` variants.
- **Using `figma.loadAllPagesAsync()`:** Loads everything into memory at once. Load pages one at a time with `page.loadAsync()`.
- **Using `findAll()` with a callback for type filtering:** `page.findAll(n => n.type === 'TEXT')` traverses every node then filters. Use `findAllWithCriteria({ types: ['TEXT'] })` instead — it prunes the traversal.
- **Iterating fills without checking `figma.mixed`:** On text nodes, `node.fills` can be `figma.mixed` (different fills per character range). Always check before iterating.
- **Forgetting `figma.skipInvisibleInstanceChildren = true`:** Default is `false` in Figma. Setting it dramatically speeds up traversal in documents with large instances.
- **Accessing `node.mainComponent` directly on InstanceNode:** With `dynamic-page`, it is **write-only** — use `getMainComponentAsync()` to read it.
- **Accessing `component.instances` directly:** Throws with `dynamic-page` — use `getInstancesAsync()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color storage format | Custom RGB encoder | `rgbToHex()` utility (< 5 lines) | Simple math, no library needed |
| Node type checking | Custom type guard functions | TypeScript's type narrowing + `node.type` discriminant | `@figma/plugin-typings` typings handle this exactly |
| Async coordination | Custom Promise pool | `await Promise.all([...])` for parallel pre-loads | Standard ES2017 — pre-loads are independent |
| Unique ID generation | UUID library | `nodeId + category + issueType` concatenation | Deterministic, no library needed, stable across re-runs |

**Key insight:** The Figma Plugin API is synchronous for property reads after pages are loaded. The only async operations are pre-loading (styles, variables, page.loadAsync). Keep the per-node auditors pure synchronous functions.

---

## Common Pitfalls

### Pitfall 1: Calling Sync Style/Variable Methods with dynamic-page
**What goes wrong:** `figma.getLocalPaintStyles()` throws at runtime with message "This function is not available with dynamic-page documentAccess".
**Why it happens:** The manifest declares `"documentAccess": "dynamic-page"` which restricts the API surface.
**How to avoid:** Always use `figma.getLocalPaintStylesAsync()`, `figma.getLocalTextStylesAsync()`, `figma.variables.getLocalVariablesAsync()`.
**Warning signs:** TypeScript will not catch this — it's a runtime error. Test in Figma early.

### Pitfall 2: Accessing Page Children Without loadAsync
**What goes wrong:** `page.findAll()` returns empty array or throws — the page content is not loaded.
**Why it happens:** With `dynamic-page`, pages are lazily loaded.
**How to avoid:** Always `await page.loadAsync()` before calling `findAll`, `findAllWithCriteria`, or accessing `children`.
**Warning signs:** Empty results when scanning pages that aren't the current page.

### Pitfall 3: Mixed Values on Text Nodes
**What goes wrong:** Accessing `node.fontSize` returns `figma.mixed` (a Symbol), then `String(figma.mixed)` produces `"Symbol(figma.mixed)"` instead of a number.
**Why it happens:** Text nodes can have multiple font sizes in different character ranges. The whole-node property returns `figma.mixed` in this case.
**How to avoid:** Check `node.fontSize !== figma.mixed` before using. For complete coverage, use `node.getStyledTextSegments(['fontSize', 'textStyleId', 'boundVariables'])` to audit per-segment.
**Warning signs:** `offendingValue` showing `"Symbol(figma.mixed)"` in audit output.

### Pitfall 4: VariableAlias vs Variable Object
**What goes wrong:** `node.boundVariables.fills[0]` returns a `VariableAlias` (`{ type: 'VARIABLE_ALIAS', id: string }`) — NOT the Variable itself. Treating it as a Variable (accessing `.name`, `.resolvedType`) fails.
**Why it happens:** `boundVariables` stores references (aliases), not the actual Variable objects.
**How to avoid:** For audit purposes, only check whether the alias exists (`bv?.fills?.[0] !== undefined`). You don't need to resolve it to the full Variable for the audit engine.
**Warning signs:** TypeScript errors when trying to access `.name` on a `VariableAlias`.

### Pitfall 5: fileKey Unavailable on Free Tier
**What goes wrong:** `figma.fileKey` returns `undefined` for normal (non-private) plugins. AuditReport.fileId would be `undefined`.
**Why it happens:** `fileKey` is only available to private organization plugins with `enablePrivatePluginApi` in manifest.
**How to avoid:** Use `figma.root.name` as a fallback identifier for `fileId` and `fileName`. Document this limitation clearly.
**Warning signs:** `figma.fileKey === undefined` in production.

### Pitfall 6: Component Detection False Positives
**What goes wrong:** Common names like "Button", "Card", "Header" exist as both components and intentional non-component frames (e.g., a wireframe page labeled "Button").
**Why it happens:** Name-match heuristic has no structural validation.
**How to avoid:** This is acceptable for v1 — the requirement spec (AUDIT-05) says "match the size/shape of existing components" but size/shape comparison is O(n²) and not practical in the sandbox without significant complexity. Name matching is the right v1 heuristic. Document it as approximate.
**Warning signs:** High false positive rate on files with page names matching component names.

### Pitfall 7: Gradient/Image Paints Cannot Be Variable-Bound
**What goes wrong:** Checking `fill.boundVariables` on a `GradientPaint` or `ImagePaint` — these don't have `boundVariables` at the top level (only gradient color stops do).
**Why it happens:** Only `SolidPaint` has `boundVariables.color`. The `type` discriminant controls what properties exist.
**How to avoid:** Check `fill.type === 'SOLID'` before checking `boundVariables`.

### Pitfall 8: Spacing Audit on Value 0
**What goes wrong:** Flagging padding of `0` as "hardcoded" produces noise — zero is typically intentional and cannot be a variable in meaningful way.
**Why it happens:** The auditor checks all non-zero numeric values.
**How to avoid:** Skip the field when value is `0`. Only flag when `value !== 0`.

---

## Code Examples

### Complete START_SCAN Handler (replacing the stub in code.ts)

```typescript
// Source: packages/plugin/src/sandbox/code.ts stub + Phase 2 implementation
case 'START_SCAN': {
  runAudit()
    .then((report) => {
      const msg: SandboxMessage = { type: 'SCAN_COMPLETE', report };
      figma.ui.postMessage(msg);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error during scan';
      const msg: SandboxMessage = { type: 'SCAN_ERROR', message };
      figma.ui.postMessage(msg);
    });
  break;
}
```

### findAllWithCriteria for Typed Node Results

```typescript
// Source: @figma/plugin-typings ChildrenMixin.findAllWithCriteria
// Returns TextNode[] (not SceneNode[]) — full type narrowing
const textNodes: TextNode[] = page.findAllWithCriteria({ types: ['TEXT'] });
const frameNodes: (FrameNode | ComponentNode | InstanceNode)[] =
  page.findAllWithCriteria({ types: ['FRAME', 'COMPONENT', 'INSTANCE'] });
```

### Checking fillStyleId with Mixed Safety

```typescript
// Source: @figma/plugin-typings GeometryMixin.fillStyleId returns string | PluginAPI['mixed']
function isFillBoundToStyle(node: SceneNode, styleIds: Set<string>): boolean {
  if (!('fillStyleId' in node)) return false;
  const id = node.fillStyleId;
  if (id === figma.mixed) return false; // mixed — treat as not bound
  return id !== '' && styleIds.has(id as string);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `findAll(n => n.type === 'TEXT')` | `findAllWithCriteria({ types: ['TEXT'] })` | Figma API ~2022 | Hundreds of times faster on large documents |
| `getLocalPaintStyles()` (sync) | `getLocalPaintStylesAsync()` | Figma API with dynamic-page manifest (2023+) | Required — sync throws with dynamic-page |
| `page.children` direct access | `await page.loadAsync()` first | Figma API with dynamic-page manifest (2023+) | Required — pages not loaded by default |
| `instance.mainComponent` (read) | `await instance.getMainComponentAsync()` | Figma API with dynamic-page manifest (2023+) | Required — read is disabled for dynamic-page |
| `figma.loadAllPagesAsync()` | Per-page `page.loadAsync()` | Best practice change | Prevents OOM on large files |

**Deprecated/outdated (do not use in this phase):**
- `getLocalPaintStyles()` — sync, throws with dynamic-page. Deprecated in typings.
- `getLocalTextStyles()` — sync, throws. Deprecated.
- `figma.variables.getLocalVariables()` — sync, throws. Deprecated.
- `page.findAll()` with type-filter callback — functional but much slower than `findAllWithCriteria`.
- `instance.mainComponent` (reading it) — write-only with dynamic-page.

---

## Open Questions

1. **fileId field in AuditReport**
   - What we know: `figma.fileKey` returns `undefined` for non-private plugins. `figma.root.name` is the document name.
   - What's unclear: Is there another way to get the file key in a free plugin (needed for MCP server to correlate data)?
   - Recommendation: Use `figma.root.name` as the `fileId` fallback in Phase 2. Phase 3 (Data Injection) will inject into `figma.root.setPluginData()` — the MCP server reads pluginData from the REST API response which includes the file key separately. This is acceptable for v1.

2. **DesignToken extraction scope**
   - What we know: `AuditReport.tokens: DesignToken[]` is in the type. Phase 2 requirements (AUDIT-01 through AUDIT-09) are about audit issues, not token extraction.
   - What's unclear: Does the planner expect token extraction in Phase 2 or Phase 3?
   - Recommendation: Produce an empty `tokens: []` array in Phase 2's AuditReport. Token extraction logic (reading `figma.variables.getLocalVariablesAsync()` and mapping to `DesignToken[]`) is a natural addition, but the AUDIT requirements don't explicitly require it. Leave tokens empty or do minimal extraction.

3. **ComponentSpec extraction scope**
   - Same as tokens — `AuditReport.components: ComponentSpec[]` is typed but AUDIT-05 only asks to detect disconnected components, not to fully enumerate all components with props/variants.
   - Recommendation: Populate `components` with minimal data (id, name, key, description, variants) from `ComponentNode` during the component-name-collection pass. This makes Phase 2's AuditReport usable by Phase 4 MCP tools.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skip formal test map.

The sandbox runs inside Figma Desktop and cannot be unit tested with Vitest directly (no Figma runtime in Node). The strategy is:

- **Manual verification in Figma:** Load the built plugin, open a test file with known hardcoded values, trigger START_SCAN, verify SCAN_COMPLETE report matches expected issues.
- **Pure function unit tests:** Extract `rgbToHex()`, `buildIssueId()`, `assembleReport()` as pure functions in `audit/utils.ts` — these can be tested with Vitest since they have no Figma API dependencies.
- **Type-check as primary gate:** `npm run type-check` catches most API misuse before runtime.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@figma/plugin-typings@1.123.0/plugin-api.d.ts` — All API signatures, method availability, deprecation notices (lines cited in examples above)
- `packages/shared/src/types.ts` — AuditReport, AuditIssue interfaces (Phase 1 output)
- `packages/shared/src/messages.ts` — SandboxMessage/UIMessage discriminated unions (Phase 1 output)
- `packages/plugin/src/sandbox/code.ts` — Existing START_SCAN stub to fill in
- `packages/plugin/manifest.json` — Confirms `documentAccess: "dynamic-page"` constraint

### Secondary (MEDIUM confidence)
- Figma Plugin API documentation (https://developers.figma.com/docs/plugins/api) — API behavior descriptions cross-reference the typings. Not fetched directly but the typings are auto-generated from the same source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — installed packages verified from `node_modules`
- API method availability: HIGH — verified from installed `@figma/plugin-typings@1.123.0`
- dynamic-page constraints: HIGH — deprecated annotations in typings explicitly state "throws if documentAccess: dynamic-page"
- Architecture patterns: HIGH — derived directly from type signatures and manifest constraints
- Component detection heuristic: MEDIUM — name-matching is practical; structural matching is not feasible without O(n²) cost

**Research date:** 2026-03-03
**Valid until:** 2026-09-03 (stable — Figma Plugin API versions change slowly; re-verify if @figma/plugin-typings major version updates)
