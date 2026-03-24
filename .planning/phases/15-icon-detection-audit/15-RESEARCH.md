# Phase 15: Icon Detection & Audit - Research

**Researched:** 2026-03-24
**Domain:** Figma Plugin API icon node detection, icon audit heuristics, MCP schema extension
**Confidence:** HIGH

## Summary

Phase 15 adds an icon auditor to the existing audit pipeline. The plugin must detect icon nodes through three independent heuristics (name patterns, icon font families, disconnected vector frames), then audit them for size inconsistency and hardcoded fill colors. The feature is gated behind a new `icons` toggle in the scope config, disabled by default, to prevent data bloat on icon-heavy design systems.

The implementation follows the exact same auditor pattern established in Phase 7 (v2.0): a pure function accepting `AuditNode*` plain objects, returning `AuditIssue[]`, with the category `'icon'` added to the union. The icon auditor piggybacks on the existing PASS 2 node traversal in `audit/index.ts` -- no second full scan required. The MCP server needs the `'icon'` category added to the `CATEGORY_ENUM` in `get-audit-summary.ts` and `adapter.ts`.

**Primary recommendation:** Follow the established auditor pattern exactly. Create `audit/icon.ts` with pure detection + audit functions, add `AuditNodeIcon` to `inputs.ts`, wire into the PASS 2 loop with `shouldRunAuditor('icon', enabled)`, and extend `AuditCategory` union plus `ScopeConfig` defaults.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ICON-01 | Detect icon nodes by name pattern (icon/, Icon/, ic_, icons/) | Name-pattern heuristic: `isIconByName()` pure function with regex/startsWith checks |
| ICON-02 | Detect icon nodes by font family (Material Icons, Font Awesome, Ionicons, etc.) | Font-family heuristic: `isIconByFont()` pure function checking `fontName.family` on TEXT nodes |
| ICON-03 | Detect disconnected vector icons: small square frames (16-48px) with only paths, not instances | Vector-frame heuristic: `isDisconnectedVectorIcon()` checking dimensions, children types, non-instance |
| ICON-04 | Report icon size inconsistencies (sizes outside 16/20/24/32/40/48 scale) | `auditIconSize()` checks node width/height against standard scale set |
| ICON-05 | Report hardcoded fill colors on icon nodes | Reuse existing `auditFills()` logic or call it with category='icon' override |
| ICON-06 | Icons toggle in Audit Scope, disabled by default | Add `'icon'` to `AuditCategory`, `ScopeConfig`, `DEFAULT_SCOPE_CONFIG` (default: false) |
| ICON-07 | When icons toggle disabled, zero icon nodes processed | `shouldRunAuditor('icon', enabled)` gate in PASS 2 loop -- same pattern as all other auditors |
| ICON-08 | MCP server exposes icon audit results in response schema | Add `'icon'` to `CATEGORY_ENUM` in `get-audit-summary.ts` and `adapter.ts` |
</phase_requirements>

## Standard Stack

### Core (no new dependencies)

This phase requires zero new npm packages. Everything is built with existing project infrastructure:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | (existing) | Unit tests for icon detection heuristics | Already configured, 196 tests green |
| TypeScript strict | (existing) | Type-safe AuditNodeIcon interface | Project standard |

### No New Packages Required

The icon auditor is pure TypeScript logic operating on `AuditNode*` plain objects. No external icon-detection libraries exist that would be relevant -- the heuristics are domain-specific name/size/font checks.

## Architecture Patterns

### Recommended File Structure
```
packages/plugin/src/sandbox/audit/
  icon.ts           # isIconByName(), isIconByFont(), isDisconnectedVectorIcon(),
                    # auditIconSize(), auditIconFills() -- all pure functions
  icon.test.ts      # Unit tests for all detection + audit functions
  inputs.ts         # + AuditNodeIcon interface

packages/shared/src/
  types.ts          # AuditIssue.category union + 'icon'
  messages.ts       # AuditCategory union + 'icon'

packages/plugin/src/ui/
  state.ts          # ScopeConfig + icon: false default
  views/ConfigView.tsx  # SCOPE_CATEGORIES array + Icons entry

packages/mcp-server/src/
  adapter.ts        # CATEGORY_VALUES + 'icon'
  tools/get-audit-summary.ts  # CATEGORY_ENUM + 'icon'
```

### Pattern 1: Auditor Function Signature (established pattern)
**What:** Every auditor is a pure function: `(node: AuditNodeX, pageName: string, ...context) => AuditIssue[]`
**When to use:** Always -- this is the project's core architectural pattern.
**Example:**
```typescript
// Follows exact pattern from color.ts, border.ts, effects.ts
export function auditIconSize(
  node: AuditNodeIcon,
  pageName: string,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const STANDARD_SIZES = new Set([16, 20, 24, 32, 40, 48]);

  if (!STANDARD_SIZES.has(node.width) || !STANDARD_SIZES.has(node.height)) {
    issues.push(
      buildIssue(node, pageName, 'icon', 'non-standard-size',
        `${node.width}x${node.height}`,
        'Use a standard icon size: 16, 20, 24, 32, 40, or 48px')
    );
  }
  return issues;
}
```

### Pattern 2: Detection Predicate Functions (new, but follows pure-function style)
**What:** Boolean predicates that classify whether a node is an icon, separated from audit logic.
**When to use:** Icon detection requires multiple heuristics; separating detection from audit keeps functions focused and independently testable.
**Example:**
```typescript
const ICON_NAME_PATTERNS = [
  /^icon[\/\-_]/i,   // icon/, icon-, icon_
  /^ic[_\-]/i,        // ic_, ic-
  /^icons\//i,         // icons/
  /\/icon[\/\-_]/i,    // .../icon/...
];

export function isIconByName(name: string): boolean {
  return ICON_NAME_PATTERNS.some(re => re.test(name));
}
```

### Pattern 3: Piggyback on Existing Traversal
**What:** Icon audit hooks into the existing PASS 2 `for (const node of nodes)` loop in `audit/index.ts`, exactly like every other auditor.
**When to use:** Always. The requirements explicitly state no second full scan.
**Example (in audit/index.ts PASS 2 loop):**
```typescript
// Icon: detection + size + fills (ICON-01 through ICON-05)
if (shouldRunAuditor('icon', enabled)) {
  const iconNode = node as unknown as AuditNodeIcon;
  if (isIconNode(iconNode)) {
    allIssues.push(...auditIconSize(iconNode, pageName));
    allIssues.push(...auditIconFills(iconNode, pageName, styleIds));
  }
}
```

### Anti-Patterns to Avoid
- **Second full tree traversal:** Icon detection MUST NOT call `page.findAll()` or `findAllWithCriteria()` separately. It piggybacks on the existing PASS 2 loop.
- **Direct Figma API calls in auditor functions:** Auditors receive `AuditNode*` plain objects, never `SceneNode`. This is the project's core testability pattern.
- **Hardcoded font detection in the traversal loop:** Font-family check logic belongs in `icon.ts`, not in `index.ts`.
- **Coupling icon detection to icon audit:** Keep `isIconByName()`, `isIconByFont()`, `isDisconnectedVectorIcon()` as separate pure predicates from `auditIconSize()`, `auditIconFills()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fill color audit on icon nodes | New hardcoded-fill detection logic | Reuse `auditFills()` from `color.ts` or extract shared fill-check helper | Same logic, different category label |
| Issue ID generation | Manual string concatenation | `buildIssue()` from `utils.ts` | Already handles deterministic ID format |
| Scope toggle UI | Custom toggle component | Existing `ToggleSwitch` component | Already built and styled in Phase 14 |
| Category filtering in MCP | Custom filter logic | Existing `CATEGORY_ENUM` filter pattern in `get-audit-summary.ts` | Just add `'icon'` to the enum |

**Key insight:** The icon auditor's fill-color check (ICON-05) is nearly identical to `auditFills()` in `color.ts`. The difference is only the `category` field (`'icon'` vs `'color'`). Consider either: (a) a thin wrapper that calls the same fill-inspection logic but tags issues as `'icon'`, or (b) a shared helper extracted from `color.ts`. Option (a) is simpler and avoids refactoring existing code.

## Common Pitfalls

### Pitfall 1: fontName is mixed-compatible
**What goes wrong:** Accessing `node.fontName.family` crashes when `fontName === figma.mixed` (text node with multiple fonts).
**Why it happens:** TEXT nodes with mixed font ranges return `figma.mixed` (a Symbol) for `fontName`.
**How to avoid:** The `AuditNodeIcon` interface must type `fontName` as `{ family: string; style: string } | symbol | undefined`. The `isIconByFont()` function must guard: `if (typeof node.fontName === 'symbol' || !node.fontName) return false`.
**Warning signs:** TypeError at runtime on mixed-text nodes.

### Pitfall 2: False positives on name pattern matching
**What goes wrong:** Nodes named "icon-button-container" or "iconography-section" are flagged as icons when they are layout frames.
**Why it happens:** Overly broad regex matching.
**How to avoid:** Pattern matching should be strict: only match name segments that indicate the node IS an icon, not that it CONTAINS the word "icon". Use `^icon/` (path prefix), `^ic_` (prefix convention), not `/icon/` (substring). Also, frame nodes with many non-vector children are unlikely to be icons -- the disconnected-vector heuristic already handles the size+children check.
**Warning signs:** High false positive rate in manual testing on complex design systems.

### Pitfall 3: Disconnected vector detection on complex frames
**What goes wrong:** Small frames containing both vectors and text labels (e.g., icon + tooltip) are falsely flagged as disconnected icons.
**Why it happens:** The "contains only paths" heuristic is too loose.
**How to avoid:** The disconnected vector icon check (ICON-03) should require: (a) frame is roughly square (aspect ratio close to 1:1), (b) dimensions between 16-48px, (c) ALL children are vector-type nodes (VECTOR, BOOLEAN_OPERATION, LINE, ELLIPSE, RECTANGLE, POLYGON, STAR), (d) node is NOT an INSTANCE or COMPONENT. If any child is TEXT, FRAME, or GROUP, it is NOT a disconnected icon.
**Warning signs:** Icons with text labels being flagged.

### Pitfall 4: AuditCategory union exhaustiveness
**What goes wrong:** Adding `'icon'` to the `AuditCategory` type breaks the exhaustive switch in `appReducer` or other switch statements.
**Why it happens:** TypeScript's exhaustive checking is enabled via `never` default case.
**How to avoid:** Update ALL locations that enumerate `AuditCategory`: `messages.ts` (union), `types.ts` (AuditIssue.category union), `state.ts` (DEFAULT_SCOPE_CONFIG), `ConfigView.tsx` (SCOPE_CATEGORIES array), `adapter.ts` (CATEGORY_VALUES), `get-audit-summary.ts` (CATEGORY_ENUM), and the `enabledCount` display string in ConfigView (`"X of 7"` instead of `"X of 6"`).
**Warning signs:** TypeScript compilation errors after adding the new category.

### Pitfall 5: Data bloat on icon-heavy files
**What goes wrong:** Design systems like Material Icons have 2000+ icon components. If icons toggle is ON, the audit report grows significantly.
**Why it happens:** Each icon generates multiple AuditIssue objects.
**How to avoid:** The toggle is disabled by default (ICON-06). When disabled, `shouldRunAuditor('icon', enabled)` returns false and zero icon processing occurs. Document this in the toggle's UI subtitle.

### Pitfall 6: Accessing children for disconnected vector detection
**What goes wrong:** Not all node types have a `children` property. Attempting to access `node.children` on a VECTOR or TEXT node will fail.
**Why it happens:** Only container nodes (FRAME, GROUP, COMPONENT, INSTANCE, BOOLEAN_OPERATION) have children in Figma.
**How to avoid:** The `isDisconnectedVectorIcon()` check should only apply to FRAME and GROUP nodes (which always have `children`). VECTOR nodes themselves are leaf nodes -- they cannot contain paths.

## Code Examples

### AuditNodeIcon Interface
```typescript
// In inputs.ts -- follows exact pattern of other AuditNode* interfaces
export interface AuditNodeIcon extends AuditNode {
  width: number;
  height: number;
  // For font-based icon detection (TEXT nodes only):
  fontName?: { family: string; style: string } | symbol;
  // For fill audit (same shape as AuditNodeFills):
  fills?: ReadonlyArray<{
    type: string;
    color?: { r: number; g: number; b: number };
    boundVariables?: { color?: unknown };
  }> | symbol;
  fillStyleId?: string | symbol;
  // For disconnected vector detection (FRAME/GROUP only):
  children?: ReadonlyArray<{ type: string }>;
}
```

### Icon Detection Predicates
```typescript
// Name-based detection (ICON-01)
const ICON_NAME_PATTERNS = [
  /^icon[\/\-_]/i,
  /^ic[_\-]/i,
  /^icons\//i,
];

export function isIconByName(name: string): boolean {
  return ICON_NAME_PATTERNS.some(re => re.test(name));
}

// Font-based detection (ICON-02)
const ICON_FONT_FAMILIES = new Set([
  'material icons',
  'material symbols',
  'font awesome',
  'fontawesome',
  'ionicons',
  'feather',
  'phosphor',
  'tabler icons',
  'remix icon',
  'bootstrap icons',
]);

export function isIconByFont(fontName: { family: string } | symbol | undefined): boolean {
  if (!fontName || typeof fontName === 'symbol') return false;
  return ICON_FONT_FAMILIES.has(fontName.family.toLowerCase());
}

// Disconnected vector detection (ICON-03)
const VECTOR_CHILD_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'ELLIPSE', 'RECTANGLE', 'POLYGON', 'STAR',
]);

export function isDisconnectedVectorIcon(node: AuditNodeIcon): boolean {
  // Must be FRAME or GROUP (not INSTANCE, not COMPONENT)
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  // Must be small and roughly square
  const { width, height } = node;
  if (width < 16 || width > 48 || height < 16 || height > 48) return false;
  const ratio = width / height;
  if (ratio < 0.8 || ratio > 1.25) return false;
  // Must have children and all must be vector types
  if (!node.children || node.children.length === 0) return false;
  return node.children.every(c => VECTOR_CHILD_TYPES.has(c.type));
}
```

### Wiring Into PASS 2 (audit/index.ts)
```typescript
// Import
import { isIconByName, isIconByFont, isDisconnectedVectorIcon, auditIconSize, auditIconFills } from './icon';
import type { AuditNodeIcon } from './inputs';

// Inside the PASS 2 node loop, after existing auditors:
if (shouldRunAuditor('icon', enabled)) {
  const iconNode = node as unknown as AuditNodeIcon;
  const isIcon = isIconByName(node.name)
    || (node.type === 'TEXT' && isIconByFont(iconNode.fontName))
    || isDisconnectedVectorIcon(iconNode);
  if (isIcon) {
    allIssues.push(...auditIconSize(iconNode, pageName));
    allIssues.push(...auditIconFills(iconNode, pageName, styleIds));
  }
}
```

### Extending AuditCategory Union
```typescript
// In messages.ts:
export type AuditCategory = 'color' | 'typography' | 'spacing' | 'border' | 'effects' | 'component' | 'icon';

// In types.ts (AuditIssue):
category: 'color' | 'typography' | 'spacing' | 'border' | 'effects' | 'component' | 'icon';

// In state.ts:
export const DEFAULT_SCOPE_CONFIG: ScopeConfig = {
  color: true,
  typography: true,
  spacing: true,
  border: true,
  effects: true,
  component: true,
  icon: false,  // ICON-06: disabled by default
};

// In ConfigView.tsx:
const SCOPE_CATEGORIES: Array<{ key: AuditCategory; label: string }> = [
  { key: 'color', label: 'Colors' },
  { key: 'typography', label: 'Typography' },
  { key: 'spacing', label: 'Spacing' },
  { key: 'border', label: 'Borders' },
  { key: 'effects', label: 'Effects' },
  { key: 'component', label: 'Components' },
  { key: 'icon', label: 'Icons' },
];
// Also update enabledCount display: "X of 7"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getVariableById` (sync) | `getVariableByIdAsync` (async) | Figma dynamic-page manifest | Must use async variant for any variable resolution |
| `fontName` as simple object | `fontName` returns `FontName \| figma.mixed` | Always been this way | Must guard for mixed symbol |
| `findAll()` for traversal | `findAllWithCriteria({ types: [...] })` | Figma Plugin API update 41 | Much faster, narrowly typed returns |

**Figma API notes (verified):**
- `node.fontName` on TextNode returns `FontName | figma.mixed` -- the `FontName` interface has `{ family: string; style: string }`.
- `findAllWithCriteria` supports `VECTOR`, `BOOLEAN_OPERATION`, `LINE`, `ELLIPSE`, etc. in the types array.
- All APIs used (node.name, node.type, node.width, node.height, node.fills, node.fontName, node.children) are available to free-plan Figma plugins -- no Enterprise/Organization restrictions.
- No REST API calls needed -- all detection runs in the plugin sandbox via Plugin API.

## Open Questions

1. **Aspect ratio tolerance for disconnected vector detection**
   - What we know: Icons are typically square, but some may be slightly rectangular (e.g., 24x22 for a horizontal arrow).
   - What's unclear: The exact tolerance threshold.
   - Recommendation: Use 0.8-1.25 ratio range (allows ~20% deviation from square). Tune after manual testing.

2. **Icon font family list completeness**
   - What we know: Material Icons, Font Awesome, Ionicons are the most common. Others include Feather, Phosphor, Tabler, Remix, Bootstrap Icons.
   - What's unclear: Whether there are popular icon fonts we're missing.
   - Recommendation: Start with the 10 most common families. The list is a constant and easy to extend later.

3. **Should icon fill audit reuse color auditor or be independent?**
   - What we know: The logic is identical (check for hardcoded SOLID fills without boundVariables.color).
   - What's unclear: Whether refactoring `auditFills` to accept a category parameter is worth the churn.
   - Recommendation: Create `auditIconFills()` in `icon.ts` that contains the fill-check logic directly (copy the ~15 lines from color.ts), tagged with category `'icon'`. Avoids touching working code.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (current, 196 tests green) |
| Config file | `packages/plugin/vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ICON-01 | Name pattern detection | unit | `npx vitest run packages/plugin/src/sandbox/audit/icon.test.ts -t "isIconByName"` | -- Wave 0 |
| ICON-02 | Font family detection | unit | `npx vitest run packages/plugin/src/sandbox/audit/icon.test.ts -t "isIconByFont"` | -- Wave 0 |
| ICON-03 | Disconnected vector detection | unit | `npx vitest run packages/plugin/src/sandbox/audit/icon.test.ts -t "isDisconnectedVectorIcon"` | -- Wave 0 |
| ICON-04 | Size inconsistency audit | unit | `npx vitest run packages/plugin/src/sandbox/audit/icon.test.ts -t "auditIconSize"` | -- Wave 0 |
| ICON-05 | Hardcoded fill audit on icons | unit | `npx vitest run packages/plugin/src/sandbox/audit/icon.test.ts -t "auditIconFills"` | -- Wave 0 |
| ICON-06 | Icons toggle default false | unit | `npx vitest run packages/plugin/src/sandbox/audit/scope.test.ts` + `state.test.ts` | -- Wave 0 |
| ICON-07 | Zero processing when disabled | unit | `npx vitest run packages/plugin/src/sandbox/audit/index.test.ts -t "shouldRunAuditor"` | Partially (existing shouldRunAuditor tests) |
| ICON-08 | MCP schema exposure | unit | `npx vitest run packages/mcp-server/src/adapter.test.ts` | Partially (existing adapter tests) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/plugin/src/sandbox/audit/icon.test.ts` -- covers ICON-01 through ICON-05
- [ ] Update `packages/plugin/src/sandbox/audit/scope.test.ts` -- covers ICON-06 (icon default false)
- [ ] Update `packages/plugin/src/sandbox/audit/index.test.ts` -- covers ICON-07 (shouldRunAuditor with 'icon')

## Sources

### Primary (HIGH confidence)
- Figma Plugin API official docs: [TextNode](https://developers.figma.com/docs/plugins/api/TextNode/) -- fontName type is `FontName | figma.mixed`
- Figma Plugin API official docs: [FontName](https://www.figma.com/plugin-docs/api/FontName/) -- `{ family: string; style: string }`
- Figma Plugin API official docs: [findAllWithCriteria](https://developers.figma.com/docs/plugins/api/properties/nodes-findallwithcriteria/) -- supports VECTOR, BOOLEAN_OPERATION types
- Figma Plugin API official docs: [Shared Node Properties](https://www.figma.com/plugin-docs/api/node-properties/) -- name, type, width, height available on all SceneNodes
- Codebase analysis: `audit/index.ts`, `audit/color.ts`, `audit/inputs.ts`, `shared/types.ts`, `shared/messages.ts` -- established patterns

### Secondary (MEDIUM confidence)
- Common icon font family names -- based on widespread ecosystem knowledge (Material Icons, Font Awesome, Ionicons verified via official project names)

### Tertiary (LOW confidence)
- Aspect ratio tolerance (0.8-1.25) -- reasonable engineering guess, needs manual validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, follows established patterns exactly
- Architecture: HIGH -- direct extension of existing auditor pattern, codebase analysis confirms all integration points
- Pitfalls: HIGH -- fontName mixed behavior verified via official Figma docs, other pitfalls based on direct codebase analysis
- Detection heuristics: MEDIUM -- name patterns and font families are reasonable but may need tuning after real-world testing

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain, no expected API changes)
