import type { AuditReport } from '@shared/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type Tab = 'audit' | 'config';
export type Phase = 'idle' | 'scanning' | 'injecting' | 'complete' | 'error';
export type CssFramework = 'tailwind' | 'css-variables' | 'css-modules' | 'styled-components';

export interface AppState {
  tab: Tab;
  phase: Phase;
  report: AuditReport | null;
  isOutOfSync: boolean;
  errorMessage: string | null;
  cssFramework: CssFramework;
  scanProgress: { percent: number; currentNode: string } | null;
  copied: boolean;
  contextStatus: 'injected' | 'outdated' | 'missing' | null;
  unpublishedCount: number;
  fileKey: string | null;
}

export const initialState: AppState = {
  tab: 'audit',
  phase: 'idle',
  report: null,
  isOutOfSync: false,
  errorMessage: null,
  cssFramework: 'tailwind',
  scanProgress: null,
  copied: false,
  contextStatus: null,
  unpublishedCount: 0,
  fileKey: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type AppAction =
  | { type: 'SCAN_PROGRESS'; percent: number; currentNode: string }
  | { type: 'SCAN_COMPLETE'; report: AuditReport }
  | { type: 'SCAN_ERROR'; message: string }
  | { type: 'INJECT_COMPLETE' }
  | { type: 'INJECT_ERROR'; message: string }
  | { type: 'SYNC_OUTDATED' }
  | { type: 'START_AUDIT' }
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET_CSS_FRAMEWORK'; cssFramework: CssFramework }
  | { type: 'SET_COPIED'; copied: boolean }
  | { type: 'RESET_ERROR' }
  | { type: 'SET_CONTEXT_STATUS'; status: 'injected' | 'outdated' | 'missing' }
  | { type: 'SET_FILE_KEY'; fileKey: string | null };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SCAN_PROGRESS':
      return { ...state, phase: 'scanning', scanProgress: { percent: action.percent, currentNode: action.currentNode } };

    case 'SCAN_COMPLETE':
      return {
        ...state,
        phase: 'injecting',
        report: action.report,
        scanProgress: null,
        unpublishedCount: action.report.summary.unpublishedComponents,
      };

    case 'SCAN_ERROR':
      return { ...state, phase: 'error', errorMessage: action.message, scanProgress: null };

    case 'INJECT_COMPLETE':
      return { ...state, phase: 'complete', isOutOfSync: false, scanProgress: null, contextStatus: 'injected' };

    case 'INJECT_ERROR':
      return { ...state, phase: 'error', errorMessage: action.message, scanProgress: null };

    case 'SYNC_OUTDATED':
      return { ...state, isOutOfSync: true, contextStatus: 'outdated' };

    case 'START_AUDIT':
      return { ...state, phase: 'scanning', scanProgress: null, errorMessage: null, isOutOfSync: false };

    case 'SET_TAB':
      return { ...state, tab: action.tab };

    case 'SET_CSS_FRAMEWORK':
      return { ...state, cssFramework: action.cssFramework };

    case 'SET_COPIED':
      return { ...state, copied: action.copied };

    case 'RESET_ERROR':
      return { ...state, phase: 'idle', errorMessage: null };

    case 'SET_CONTEXT_STATUS':
      return { ...state, contextStatus: action.status };

    case 'SET_FILE_KEY':
      return { ...state, fileKey: action.fileKey };

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
