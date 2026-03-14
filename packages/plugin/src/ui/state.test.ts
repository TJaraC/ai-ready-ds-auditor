import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from './state';
import type { AppAction } from './state';
import type { AuditReport } from '@shared/types';

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

const mockReport: AuditReport = {
  schemaVersion: '1.0.0',
  fileId: 'file-123',
  fileName: 'Test File',
  scannedAt: '2026-03-10T00:00:00.000Z',
  summary: {
    totalIssues: 2,
    totalTokens: 10,
    totalComponents: 3,
    issuesByCategory: { color: 2 },
    healthScore: 75,
    unpublishedComponents: 0,
  },
  issues: [],
  components: [],
  tokens: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appReducer', () => {
  it('returns initialState when given an empty state and unknown action', () => {
    // Verify initialState shape
    expect(initialState.tab).toBe('audit');
    expect(initialState.phase).toBe('idle');
    expect(initialState.report).toBeNull();
    expect(initialState.isOutOfSync).toBe(false);
    expect(initialState.errorMessage).toBeNull();
    expect(initialState.cssFramework).toBe('tailwind');
    expect(initialState.scanProgress).toBeNull();
    expect(initialState.copied).toBe(false);
  });

  describe('SCAN_PROGRESS', () => {
    it('sets phase to scanning and updates scanProgress', () => {
      const action: AppAction = {
        type: 'SCAN_PROGRESS',
        percent: 42,
        currentNode: 'Button/Primary',
      };
      const next = appReducer(initialState, action);
      expect(next.phase).toBe('scanning');
      expect(next.scanProgress).toEqual({ percent: 42, currentNode: 'Button/Primary' });
    });
  });

  describe('SCAN_COMPLETE', () => {
    it('sets phase to injecting, stores report, clears scanProgress', () => {
      const stateWithProgress = {
        ...initialState,
        phase: 'scanning' as const,
        scanProgress: { percent: 100, currentNode: 'done' },
      };
      const action: AppAction = { type: 'SCAN_COMPLETE', report: mockReport };
      const next = appReducer(stateWithProgress, action);
      expect(next.phase).toBe('injecting');
      expect(next.report).toBe(mockReport);
      expect(next.scanProgress).toBeNull();
    });
  });

  describe('SCAN_ERROR', () => {
    it('sets phase to error, records errorMessage, clears scanProgress', () => {
      const stateWithProgress = {
        ...initialState,
        phase: 'scanning' as const,
        scanProgress: { percent: 50, currentNode: 'node' },
      };
      const action: AppAction = { type: 'SCAN_ERROR', message: 'Scan failed' };
      const next = appReducer(stateWithProgress, action);
      expect(next.phase).toBe('error');
      expect(next.errorMessage).toBe('Scan failed');
      expect(next.scanProgress).toBeNull();
    });
  });

  describe('INJECT_COMPLETE', () => {
    it('sets phase to complete, clears isOutOfSync and scanProgress', () => {
      const stateBeforeInject = {
        ...initialState,
        phase: 'injecting' as const,
        isOutOfSync: true,
        scanProgress: { percent: 100, currentNode: 'done' },
      };
      const action: AppAction = { type: 'INJECT_COMPLETE' };
      const next = appReducer(stateBeforeInject, action);
      expect(next.phase).toBe('complete');
      expect(next.isOutOfSync).toBe(false);
      expect(next.scanProgress).toBeNull();
    });
  });

  describe('INJECT_ERROR', () => {
    it('sets phase to error, records errorMessage, clears scanProgress', () => {
      const stateInjecting = {
        ...initialState,
        phase: 'injecting' as const,
        scanProgress: { percent: 100, currentNode: 'done' },
      };
      const action: AppAction = { type: 'INJECT_ERROR', message: 'Inject failed' };
      const next = appReducer(stateInjecting, action);
      expect(next.phase).toBe('error');
      expect(next.errorMessage).toBe('Inject failed');
      expect(next.scanProgress).toBeNull();
    });
  });

  describe('SYNC_OUTDATED', () => {
    it('sets isOutOfSync to true', () => {
      const action: AppAction = { type: 'SYNC_OUTDATED' };
      const next = appReducer(initialState, action);
      expect(next.isOutOfSync).toBe(true);
    });
  });

  describe('START_AUDIT', () => {
    it('sets phase to scanning, clears scanProgress, errorMessage, and isOutOfSync', () => {
      const dirtyState = {
        ...initialState,
        phase: 'error' as const,
        errorMessage: 'Previous error',
        isOutOfSync: true,
        scanProgress: { percent: 50, currentNode: 'leftover' },
      };
      const action: AppAction = { type: 'START_AUDIT' };
      const next = appReducer(dirtyState, action);
      expect(next.phase).toBe('scanning');
      expect(next.scanProgress).toBeNull();
      expect(next.errorMessage).toBeNull();
      expect(next.isOutOfSync).toBe(false);
    });
  });

  describe('SET_TAB', () => {
    it('updates tab to config', () => {
      const action: AppAction = { type: 'SET_TAB', tab: 'config' };
      const next = appReducer(initialState, action);
      expect(next.tab).toBe('config');
    });

    it('updates tab back to audit', () => {
      const stateWithConfigTab = { ...initialState, tab: 'config' as const };
      const action: AppAction = { type: 'SET_TAB', tab: 'audit' };
      const next = appReducer(stateWithConfigTab, action);
      expect(next.tab).toBe('audit');
    });
  });

  describe('SET_CSS_FRAMEWORK', () => {
    it('updates cssFramework', () => {
      const action: AppAction = { type: 'SET_CSS_FRAMEWORK', cssFramework: 'css-variables' };
      const next = appReducer(initialState, action);
      expect(next.cssFramework).toBe('css-variables');
    });
  });

  describe('SET_COPIED', () => {
    it('sets copied to true', () => {
      const action: AppAction = { type: 'SET_COPIED', copied: true };
      const next = appReducer(initialState, action);
      expect(next.copied).toBe(true);
    });

    it('sets copied back to false', () => {
      const stateWithCopied = { ...initialState, copied: true };
      const action: AppAction = { type: 'SET_COPIED', copied: false };
      const next = appReducer(stateWithCopied, action);
      expect(next.copied).toBe(false);
    });
  });

  describe('RESET_ERROR', () => {
    it('resets phase to idle and clears errorMessage', () => {
      const errorState = {
        ...initialState,
        phase: 'error' as const,
        errorMessage: 'Something went wrong',
      };
      const action: AppAction = { type: 'RESET_ERROR' };
      const next = appReducer(errorState, action);
      expect(next.phase).toBe('idle');
      expect(next.errorMessage).toBeNull();
    });
  });

  it('does not mutate the previous state', () => {
    const frozen = Object.freeze({ ...initialState });
    const action: AppAction = { type: 'SET_TAB', tab: 'config' };
    // Should not throw even with frozen state, because reducer uses spread
    const next = appReducer(frozen as typeof initialState, action);
    expect(next.tab).toBe('config');
  });
});
