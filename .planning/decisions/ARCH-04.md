# ARCH-04: Parsing/Serialization Separation

**Status:** Decided
**Date:** 2026-03-09
**Requirement:** ARCH-04

---

## Context

Parsing and serialization happens in two places:

### Plugin side (write path)
- `packages/plugin/src/sandbox/inject.ts` — serializes `AuditReport` to JSON, splits into chunks, writes to `figma.root.setPluginData()`
- After ARCH-02: `serialize.ts` will handle the pure serialization; `inject.ts` handles the write

### MCP server side (read path)
- `packages/mcp-server/src/figma/chunk-reader.ts` (80 LOC)
  - `reconstructReport(pluginData, fileKey)`: takes raw plugin data map → returns `{ report, meta }`
  - Concerns mixed: chunk concatenation + JSON.parse + schema version check + error throwing
- `packages/mcp-server/src/figma/client.ts` (~80 LOC)
  - `fetchFigmaFile()`: raw HTTP fetch + retry + error mapping
  - Returns `GetFileResponse` (includes `pluginData`)

**Current coupling:**
- `chunk-reader.ts` does 4 things in one function: assemble chunks, parse JSON, validate schema version, throw errors
- Tests for chunk reconstruction would require building full mock `pluginData` objects including all chunk keys
- Schema validation is inline — changing validation logic requires touching reconstruction logic

---

## Options

**Option A — Split `reconstructReport` into two functions**
`assembleChunks(pluginData): string` (pure: concatenate strings by chunk key order)
`parseAndValidate(json, fileKey): { report, meta }` (JSON parse + schema check)

**Option B — Extract a `ChunkAssembler` class**
OOP approach: stateful assembler that chunks can be fed to incrementally. Useful if streaming chunk reconstruction is ever needed.

**Option C — Keep current structure, add unit tests with mock data**
No structural change — add tests that build `pluginData` mocks with chunk keys.

---

## Decision

**Option A — Split `reconstructReport` into two pure functions.**

Rationale:
- Option B is over-engineering for a 80 LOC file
- Option C doesn't satisfy ARCH-04 (parsing/serialization not independently testable as separate concerns)
- Option A makes both concerns independently testable with minimal diff

---

## Implementation Specification

### `packages/mcp-server/src/figma/chunk-reader.ts` after refactor:

```typescript
/**
 * Assembles raw plugin data map into a single JSON string.
 * Pure function — no JSON parsing, no schema validation.
 * Throws ChunkReconstructionError if meta or chunks are missing.
 */
export function assembleChunks(pluginData: Record<string, string>, fileKey: string): string

/**
 * Parses the assembled JSON string and validates schema version.
 * Throws SchemaVersionError if schema version doesn't match.
 * Returns { report: AuditReport, meta: AuditMeta }
 */
export function parseReport(json: string, fileKey: string): { report: AuditReport; meta: AuditMeta }

/**
 * Convenience wrapper: assembleChunks + parseReport.
 * Existing callers use this — no breaking change.
 */
export function reconstructReport(
  pluginData: Record<string, string>,
  fileKey: string
): { report: AuditReport; meta: AuditMeta }
```

### Test strategy:

`assembleChunks` tests:
- Given well-formed `pluginData` with `ai_data_meta` and `ai_data_1..N` → returns correct JSON string
- Given missing `ai_data_meta` → throws `ChunkReconstructionError`
- Given missing `ai_data_2` (gap in chunks) → throws `ChunkReconstructionError`
- Given empty string chunks → throws `ChunkReconstructionError`

`parseReport` tests:
- Given valid JSON with matching `schemaVersion` → returns typed `{ report, meta }`
- Given valid JSON with mismatched `schemaVersion` → throws `SchemaVersionError`
- Given invalid JSON → throws (JSON.parse error — let it propagate naturally)

### Plugin side (ARCH-02 already handles this)

The `serialize.ts` created by ARCH-02 is the write-path equivalent:
- `serializeReport(report): ChunkPayload` — serializes and splits
- Independently testable (no Figma runtime needed)

These two sides form a symmetric pair:
- **Write:** `serializeReport` → chunk array → `injectReport` → plugin data keys
- **Read:** plugin data keys → `assembleChunks` → JSON string → `parseReport` → `AuditReport`

---

## Consequences

- **Positive:** Chunk assembly and schema validation become independently testable
- **Positive:** Symmetric read/write understanding for future maintainers
- **Positive:** `reconstructReport` wrapper preserves backward compatibility with existing callers
- **Negative:** Minimal — two extra exported functions, same file
- **Risk:** None significant — pure refactor of existing 80 LOC function

---

## Open Questions

- Should checksum validation be added to `parseReport`? Currently the plugin writes `checksum: ''` and the reader skips validation. **Decision: defer checksum implementation to v3 — document with `// TODO: checksum` comment.**
