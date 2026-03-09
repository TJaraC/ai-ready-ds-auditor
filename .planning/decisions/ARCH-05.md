# ARCH-05: UI State Management Separation

**Status:** Decided
**Date:** 2026-03-09
**Requirement:** ARCH-05

---

## Context

The v1.0 plugin UI is at `packages/plugin/src/ui/App.tsx`. It's the single React component that:
- Manages all UI state via `useState` hooks
- Listens to sandbox messages via `window.onmessage`
- Dispatches sandbox messages via `parent.postMessage`
- Renders the entire two-tab UI

Current state shape (inferred from v1.0 implementation):
- `currentTab: 'audit' | 'config'`
- `auditReport: AuditReport | null`
- `scanStatus: 'idle' | 'scanning' | 'complete' | 'error'`
- `injectStatus: 'idle' | 'injecting' | 'complete' | 'error'`
- `isSyncOutdated: boolean`
- `lastScannedAt: string`
- Error messages for scan/inject

**Problems:**
- UI components can't be tested without setting up the full message event system
- Adding new states (streaming progress, unpublished count, AI context status) means expanding `App.tsx`
- Business rules (e.g., "inject button is disabled when scan is idle") are inline in JSX
- State transitions from message handlers (`SCAN_COMPLETE`, `INJECT_COMPLETE`, etc.) are scattered

---

## Options

**Option A — Custom `useAppState` hook**
Extract all state and message handling into a custom hook. Components receive state values and callbacks as props. `App.tsx` becomes a thin shell that calls the hook and passes props down.

**Option B — `useReducer` with typed actions**
Define a `AppAction` union type and `AppState` interface. Reducer function handles all state transitions. Components dispatch typed actions. `useReducer` manages the state.

**Option C — External state library (Zustand, Jotai)**
Replace custom hooks with a store library.

---

## Decision

**Option B — `useReducer` with typed actions.**

Rationale:
- Option A (`useAppState`) still couples state to the hook's internal message handler — not independently testable
- Option B enables testing the reducer in isolation: given `(state, action) → newState`, all state transitions are pure and testable without rendering
- Option C adds a dependency for a ~150 LOC state layer — not justified
- `useReducer` is the React standard for this complexity level

---

## Implementation Specification

### New file: `packages/plugin/src/ui/state.ts`

```typescript
// State
export interface AppState {
  tab: 'audit' | 'config';
  phase: 'idle' | 'scanning' | 'injecting' | 'complete';
  report: AuditReport | null;
  streamProgress: { percent: number; currentNode: string } | null;
  syncStatus: 'unknown' | 'current' | 'outdated';
  lastScannedAt: string | null;
  error: { context: 'scan' | 'inject'; message: string } | null;
  // v2.0 additions:
  aiContextStatus: 'injected' | 'outdated' | 'missing' | null;
  unpublishedCount: number | null;
}

// Actions — driven by SandboxMessage events and user interactions
export type AppAction =
  // From sandbox messages
  | { type: 'SCAN_PROGRESS'; percent: number; currentNode: string }
  | { type: 'SCAN_COMPLETE'; report: AuditReport }
  | { type: 'SCAN_ERROR'; message: string }
  | { type: 'INJECT_COMPLETE'; bytesWritten: number; chunkCount: number }
  | { type: 'INJECT_ERROR'; message: string }
  | { type: 'SYNC_OUTDATED'; lastScannedAt: string }
  // From user interactions
  | { type: 'SET_TAB'; tab: 'audit' | 'config' }
  | { type: 'START_SCAN' }
  | { type: 'START_INJECT' };

export const initialState: AppState = { ... };

export function appReducer(state: AppState, action: AppAction): AppState { ... }
```

### New file: `packages/plugin/src/ui/useAppMessages.ts`

```typescript
// Bridges window.onmessage → dispatch(AppAction)
// Also sends UIMessages to sandbox when user actions require it
export function useAppMessages(dispatch: React.Dispatch<AppAction>): {
  startScan: () => void;
  startInject: () => void;
  selectNode: (nodeId: string) => void;
}
```

### Updated `App.tsx`:
```typescript
function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { startScan, startInject, selectNode } = useAppMessages(dispatch);
  // Render: pass state and callbacks as props to view components
}
```

### Test strategy:

`state.ts` (reducer) tests:
- `SCAN_PROGRESS` → sets `streamProgress`, sets `phase: 'scanning'`
- `SCAN_COMPLETE` → sets `report`, clears `streamProgress`, sets `phase: 'complete'`
- `SCAN_ERROR` → sets `error`, clears `streamProgress`, sets `phase: 'idle'`
- `INJECT_COMPLETE` → sets `syncStatus: 'current'`, sets `aiContextStatus: 'injected'`
- `SET_TAB` → updates `tab`
- Invalid transitions (e.g., `START_INJECT` when `phase === 'idle'`) → state unchanged

Components:
- Each view component receives `AppState` subset as props → no message setup needed for component tests

---

## Consequences

- **Positive:** All state transitions are pure functions — testable without React or Figma runtime
- **Positive:** `AppState` interface makes v2.0 additions (streamProgress, aiContextStatus, unpublishedCount) explicit and typed
- **Positive:** Clear separation: `state.ts` knows nothing about React or DOM; `useAppMessages.ts` knows nothing about state shape
- **Negative:** More files than v1.0 (~3 files vs 1 App.tsx for state concerns)
- **Risk:** `useAppMessages.ts` bridges React and the raw `window.onmessage` API — this is the remaining untestable seam. Accept it.

---

## Open Questions

- Should `AppState.aiContextStatus` and `AppState.unpublishedCount` be separate from the base `AppState`? **Decision: no** — include them in the base state, initialized to `null`. Phase 9 will set them via new `AppAction` types.
- Should `state.ts` be in `packages/shared/`? **Decision: no** — the state type references `AuditReport` which is already shared; but the state shape and transitions are plugin-UI-specific.
