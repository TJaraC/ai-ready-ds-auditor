# ARCH-01: Audit Module Separation

**Status:** Decided
**Date:** 2026-03-09
**Requirement:** ARCH-01

---

## Context

The v1.0 audit logic lives in `packages/plugin/src/sandbox/audit/`:

| File | LOC | Responsibility |
|------|-----|----------------|
| `index.ts` | 121 | Orchestrator: loads Figma API data, runs 3-pass traversal, posts progress |
| `color.ts` | 104 | `auditFills()`, `auditStrokes()` |
| `typography.ts` | 104 | `auditTypography()` |
| `spacing.ts` | 54 | `auditSpacing()` |
| `components.ts` | 35 | `auditComponents()` |
| `border.ts` | 63 | `auditBorderShape()` |
| `effects.ts` | 50 | `auditEffects()` |
| `tokens.ts` | 173 | `extractVariableTokens()`, `extractTextStyleTokens()` |
| `utils.ts` | 89 | `buildIssue()`, `assembleReport()`, `rgbToHex()` |

**Problem:** The auditor functions receive raw Figma plugin types (`SceneNode`, `TextNode`, etc.). These types only exist at Figma plugin runtime — they cannot be imported in a test environment, making unit tests impossible without mocking the entire Figma globals.

**Current coupling:**
- `index.ts` imports directly from all auditor files and calls Figma API (`figma.root`, `figma.getLocal*Async()`)
- Auditors receive `SceneNode` directly — tightly coupled to Figma runtime
- `utils.ts` builds issues from `{ id, name }` (already partially decoupled)

---

## Options

**Option A — Minimal interface extraction**
Extract typed `AuditInput` interfaces for each auditor. Each auditor accepts a plain-data struct instead of raw Figma types. `index.ts` stays as the only Figma-touching file — it reads from the API and builds the input structs.

**Option B — Full adapter layer**
Introduce an adapter that translates all Figma nodes into a normalized, pure-TS representation before auditing. Auditors receive pure TS types and are fully Figma-free.

**Option C — No structural change, just add test harness**
Keep current structure, add a test runtime mock for Figma globals. Auditors stay as-is.

---

## Decision

**Option A — Minimal interface extraction.**

Rationale:
- Option B over-engineers the transformation layer for diminishing returns
- Option C doesn't satisfy ARCH-01 (auditors must be independently importable and testable without Figma runtime)
- Option A achieves testability with minimal surface change

---

## Implementation Specification

### New interfaces (add to `packages/shared/src/types.ts` or `audit-inputs.ts` in shared):

```typescript
// Minimal node data needed by most auditors
export interface AuditNode {
  id: string;
  name: string;
  type: string;
}

// Extended for fill/stroke auditors
export interface AuditNodeFills extends AuditNode {
  fills: readonly Paint[] | symbol;        // symbol = figma.mixed
  fillStyleId?: string | symbol;
  strokes: readonly Paint[] | symbol;
  strokeStyleId?: string | symbol;
}

// Extended for typography auditor
export interface AuditNodeText extends AuditNode {
  textStyleId: string | symbol;
  fontSize: number | symbol;
  fontWeight: number | symbol;
  lineHeight: LineHeight | symbol;
  letterSpacing: LetterSpacing | symbol;
  boundVariables?: Record<string, unknown>;
}

// Extended for spacing auditor
export interface AuditNodeLayout extends AuditNode {
  layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  boundVariables?: Record<string, unknown>;
}
```

### Auditor signatures (updated):

```typescript
auditFills(node: AuditNodeFills, pageName: string, styleIds: Set<string>): AuditIssue[]
auditStrokes(node: AuditNodeFills, pageName: string, styleIds: Set<string>): AuditIssue[]
auditTypography(node: AuditNodeText, pageName: string, styleIds: Set<string>): AuditIssue[]
auditSpacing(node: AuditNodeLayout, pageName: string): AuditIssue[]
auditComponents(node: AuditNode, pageName: string, componentNames: Set<string>): AuditIssue[]
auditBorderShape(node: AuditNode & { cornerRadius?: unknown; strokeWeight?: unknown; ... }, pageName: string): AuditIssue[]
auditEffects(node: AuditNode & { effects?: unknown; effectStyleId?: unknown; ... }, pageName: string, styleIds: Set<string>): AuditIssue[]
```

### Orchestrator (`index.ts`) changes:
- Remains the only file that imports `figma.*`
- After reading Figma API data, casts `SceneNode` to the appropriate `AuditNode*` interface (a narrowing cast, not a deep copy — zero runtime overhead)
- Each `SceneNode` is assignable to these interfaces because they are structural subtypes

### Test strategy:
- Each auditor can be tested with plain JS objects conforming to `AuditNode*` interfaces
- No Figma runtime needed in test environment
- `utils.test.ts` pattern already works — extend it for each auditor

---

## Consequences

- **Positive:** Auditors become independently importable and testable without Figma runtime
- **Positive:** Minimal diff — existing auditors need only updated function signatures
- **Positive:** No behavior change (structural subtype cast, no transformation)
- **Negative:** Adds interface types to shared — slight surface area increase
- **Risk:** `figma.mixed` is a symbol at runtime — interfaces use `symbol` type; tests must supply the actual `Symbol()` for mixed-value simulation

---

## Open Questions

- Should `AuditNode*` interfaces live in `packages/shared/src/types.ts` or a new `packages/shared/src/audit-inputs.ts`? **Recommendation:** new file to avoid bloating `types.ts`.
- Should `effects.ts` and `border.ts` get their own specific input interfaces, or use a more generic `AuditNode & Record<string, unknown>`? **Recommendation:** generic for now — only create specific interfaces when tests require it.
