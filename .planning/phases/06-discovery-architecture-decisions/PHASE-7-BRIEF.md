# Phase 7 Brief: Architecture Refactor

**For:** Phase 7 planner and executor
**From:** Phase 6 discovery
**Date:** 2026-03-09

---

## What Phase 7 Must Deliver

Separate the v1.0 monolithic code into discrete, independently testable modules with stable typed contracts. **No user-facing behavior changes.** The plugin and MCP server must continue to work identically after the refactor.

See REQUIREMENTS.md: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05.

---

## Source Files to Modify

### Plugin sandbox (`packages/plugin/src/sandbox/`)

| File | Change | Decision Doc |
|------|--------|-------------|
| `audit/color.ts` | Update function signatures to accept `AuditNodeFills` instead of `SceneNode` | ARCH-01 |
| `audit/typography.ts` | Update to accept `AuditNodeText` | ARCH-01 |
| `audit/spacing.ts` | Update to accept `AuditNodeLayout` | ARCH-01 |
| `audit/components.ts` | Update to accept `AuditNode` | ARCH-01 |
| `audit/border.ts` | Update to accept `AuditNode & { ... }` | ARCH-01 |
| `audit/effects.ts` | Update to accept `AuditNode & { ... }` | ARCH-01 |
| `audit/index.ts` | After reading Figma types, cast to `AuditNode*` interfaces before passing to auditors | ARCH-01 |
| `inject.ts` | Rename to keep as-is; extract `serializeReport()` to new `serialize.ts` | ARCH-02 |

### New plugin files to create

| File | Content | Decision Doc |
|------|---------|-------------|
| `audit/inputs.ts` | `AuditNode`, `AuditNodeFills`, `AuditNodeText`, `AuditNodeLayout` interfaces | ARCH-01 |
| `serialize.ts` | `serializeReport(report: AuditReport): ChunkPayload` (pure, no Figma dep) | ARCH-02 |

### Plugin UI (`packages/plugin/src/ui/`)

| File | Change | Decision Doc |
|------|--------|-------------|
| `App.tsx` | Strip state management, call `useReducer(appReducer, initialState)`, wire `useAppMessages` | ARCH-05 |

### New UI files to create

| File | Content | Decision Doc |
|------|---------|-------------|
| `state.ts` | `AppState`, `AppAction`, `appReducer`, `initialState` | ARCH-05 |
| `useAppMessages.ts` | Window message listener → dispatch; `startScan/startInject/selectNode` callbacks | ARCH-05 |

### Shared types (`packages/shared/src/types.ts`)

| Change | Decision Doc |
|--------|-------------|
| Add `InjectionResult` export (move from `inject.ts`) | ARCH-02 |
| Add `ChunkPayload` interface | ARCH-02 |

### MCP server (`packages/mcp-server/src/`)

| File | Change | Decision Doc |
|------|--------|-------------|
| `figma/chunk-reader.ts` | Split `reconstructReport()` into `assembleChunks()` + `parseReport()` + wrapper | ARCH-04 |

### New MCP server files to create

| File | Content | Decision Doc |
|------|---------|-------------|
| `adapter.ts` | `adaptAuditSummary()`, `adaptComponentSpec()`, `adaptDesignTokens()` pure transform functions | ARCH-03 |

---

## Tests to Write

Phase 7 must add tests for every new independently-testable unit.

| Test file | What to test |
|-----------|-------------|
| `audit/color.test.ts` | `auditFills()` and `auditStrokes()` with plain `AuditNodeFills` objects |
| `audit/typography.test.ts` | `auditTypography()` with plain `AuditNodeText` objects |
| `audit/spacing.test.ts` | `auditSpacing()` with plain `AuditNodeLayout` objects |
| `audit/components.test.ts` | `auditComponents()` |
| `serialize.test.ts` | `serializeReport()`: chunk count, boundary conditions, byte measurement, metadata accuracy |
| `state.test.ts` | `appReducer()`: all state transitions from `AppAction` union |
| `chunk-reader.test.ts` | `assembleChunks()`: missing meta, missing chunk, correct concatenation; `parseReport()`: schema mismatch, valid parse |

**Test framework:** Vitest (already configured)
**Test location:** Co-located with source (`.test.ts` alongside source file) — matches `utils.test.ts` pattern

---

## Contracts That Must Not Change

Phase 7 is a refactor. These external contracts must remain identical:

1. **Plugin message API:** `UIMessage` and `SandboxMessage` union types in `packages/shared/src/messages.ts` — unchanged
2. **AuditReport schema:** `AuditReport`, `AuditIssue`, `ComponentSpec`, `DesignToken` in `packages/shared/src/types.ts` — unchanged (only additions allowed)
3. **MCP tool names and parameter schemas:** `get_audit_summary`, `get_component_specs`, `get_design_tokens` — identical Zod schemas
4. **MCP tool response format:** Tool outputs must be byte-for-byte identical for the same input (the adapter transforms should be identity transforms that just reformat, not change data)
5. **Plugin data keys:** `ai_data_meta`, `ai_data_1`, `ai_data_2...` key names — unchanged
6. **Schema version:** `schemaVersion` constant — unchanged

---

## Definition of Done for Phase 7

Phase 7 is complete when ALL of the following are true:

1. `npm run build` passes across all packages
2. `npm run type-check` passes with zero errors
3. `npm test` passes with all existing tests green + new tests added
4. Each new test file has ≥3 test cases covering success path + edge cases
5. `audit/color.ts`, `audit/typography.ts`, `audit/spacing.ts`, `audit/components.ts` import zero Figma globals — TypeScript import graph confirms this
6. `serialize.ts` imports zero Figma globals
7. `state.ts` imports zero React and zero Figma globals
8. `adapter.ts` imports zero MCP SDK types directly (only shared types)
9. `chunk-reader.ts` still exports `reconstructReport()` as the primary API (backward-compatible)

---

## Scope Boundaries

### In scope for Phase 7
- Structural refactor as described above
- New test files
- Moving `InjectionResult` and `ChunkPayload` to shared

### Out of scope for Phase 7
- Any UI visual changes (even minor spacing adjustments)
- Any MCP tool output changes
- Streaming implementation (Phase 9)
- New audit categories
- Unpublished component detection (Phase 9)

---

## Key Technical Notes

1. **`figma.mixed` as symbol:** When writing tests for auditors, `figma.mixed` is `Symbol.for('figma.mixed')` at runtime. Tests can pass `Symbol()` to simulate mixed values — no Figma import needed.

2. **`TextEncoder` in `serialize.ts`:** The `globalThis as unknown as { TextEncoder? }` cast must be preserved — this avoids ES2019 lib type issues in the plugin runtime.

3. **Vite build output:** Vite processes the sandbox (`vite.config.sandbox.ts`) and UI (`vite.config.ui.ts`) separately. New files are automatically included via TypeScript imports — no Vite config changes needed.

4. **`@shared/*` path alias:** The sandbox Vite config resolves `@shared/*` to `packages/shared/src/*`. New shared exports just need to be added to `packages/shared/src/index.ts`.

5. **The React `App.tsx` refactor:** The existing `App.tsx` has all state co-located. When extracting to `state.ts`, be careful to preserve the exact state transition logic — each `SandboxMessage` handler maps to exactly one `AppAction`. Do not change the business logic, only the structure.
