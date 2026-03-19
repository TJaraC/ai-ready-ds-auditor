# ARCH-02: Export/Inject Logic Separation

**Status:** Decided
**Date:** 2026-03-09
**Requirement:** ARCH-02

---

## Context

The v1.0 export/inject logic lives in `packages/plugin/src/sandbox/inject.ts` (60 LOC).

Current `injectReport()` signature:
```typescript
export function injectReport(report: AuditReport): InjectionResult
```

Current coupling:
- `inject.ts` imports Figma globals directly (`figma.root.getPluginDataKeys()`, `figma.root.setPluginData()`)
- `code.ts` calls `injectReport()` after `runAudit()` completes — tightly sequenced
- `InjectionResult` is defined in `inject.ts` (not in shared types)
- The inject function does: serialization, byte measurement, chunk splitting, key clearing, chunk writing, metadata writing — all in one function

**Current flow in `code.ts`:**
```
INJECT_DATA → runAudit() → injectReport(report) → postMessage(INJECT_COMPLETE)
```

**Problem:** Changing injection behavior (e.g., adding a clear-before-write strategy, changing chunk key format, adding progress reporting) requires touching `code.ts`. The audit and injection concerns are entangled in the message handler.

---

## Options

**Option A — Extract an `InjectionService` interface**
Define a typed interface `InjectionService` in shared types. The `inject.ts` implements it. `code.ts` receives the service via constructor/factory (or just imports the implementation directly). The interface is the stable contract.

**Option B — Separate serialization from writing**
Split `injectReport()` into two functions: `serializeReport(report): ChunkPayload` (pure, testable) and `writeChunks(payload, figma): InjectionResult` (Figma-dependent). Tests exercise `serializeReport` only.

**Option C — Keep `inject.ts` as-is, just move `InjectionResult` to shared**
Minimal change: export `InjectionResult` from `@shared/types`, keep function unchanged.

---

## Decision

**Option B — Separate serialization from writing.**

Rationale:
- The most valuable testability target is the chunking logic (serialization + chunk splitting) — not the `figma.setPluginData` calls which are trivially correct
- Option A adds an interface layer without improving testability of the core logic
- Option B enables testing the chunking math, byte measurement, and boundary conditions without Figma runtime
- Option C doesn't satisfy ARCH-02

---

## Implementation Specification

### New type in `packages/shared/src/types.ts`:

```typescript
export interface ChunkPayload {
  chunks: string[];          // ordered chunk array (1-indexed in storage)
  meta: AuditMeta;           // fully computed metadata (totalBytes, chunkCount, etc.)
}

export interface InjectionResult {
  chunkCount: number;
  bytesWritten: number;
}
```

### New module structure in `packages/plugin/src/sandbox/`:

**`serialize.ts`** (pure, no Figma dependency):
```typescript
export function serializeReport(report: AuditReport): ChunkPayload
// - JSON.stringify(report)
// - TextEncoder byte measurement
// - Chunk splitting at MAX_CHARS boundary
// - Build AuditMeta with chunkCount, totalBytes
// Returns: { chunks, meta }
```

**`inject.ts`** (Figma-dependent, imports serializeReport):
```typescript
export function injectReport(report: AuditReport): InjectionResult
// - calls serializeReport(report) → { chunks, meta }
// - clears existing plugin data keys
// - writes chunks via figma.root.setPluginData
// - writes metadata last
// Returns: { chunkCount, bytesWritten }
```

### Test strategy:
- `serialize.ts` is fully testable: given an `AuditReport`, assert `chunks.length`, `meta.totalBytes`, chunk boundaries
- `inject.ts` cannot be tested without Figma runtime — it stays untested (acceptable: it's ~15 LOC of trivial setPluginData calls)
- Existing `utils.test.ts` pattern applies

---

## Consequences

- **Positive:** Serialization/chunking logic is independently testable
- **Positive:** `inject.ts` becomes ~20 LOC (just write calls) — trivially auditable
- **Positive:** `serializeReport` is reusable if injection is ever split from audit in the UI flow
- **Negative:** Adds one new file (`serialize.ts`) to the sandbox
- **Risk:** `TextEncoder` runtime fallback logic moves to `serialize.ts` — must preserve the `unknown` cast pattern

---

## Open Questions

- Should `ChunkPayload` and `InjectionResult` move to `packages/shared/src/types.ts` or stay in `packages/plugin/src/sandbox/`? **Recommendation:** `InjectionResult` to shared (used by MCP server metadata). `ChunkPayload` stays in plugin sandbox — it's an internal serialization detail.
