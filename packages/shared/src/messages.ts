import type { AuditReport } from './types';

/** The 6 audit categories matching AuditIssue.category. */
export type AuditCategory = 'color' | 'typography' | 'spacing' | 'border' | 'effects' | 'component';

// Messages FROM sandbox TO UI
export type SandboxMessage =
  | { type: 'SCAN_PROGRESS'; percent: number; currentNode: string }
  | { type: 'SCAN_COMPLETE'; report: AuditReport }
  | { type: 'SCAN_ERROR'; message: string }
  | { type: 'INJECT_COMPLETE'; bytesWritten: number; chunkCount: number }
  | { type: 'INJECT_ERROR'; message: string }
  | { type: 'SYNC_OUTDATED'; lastScannedAt: string }
  | { type: 'CONTEXT_STATUS_CHECK'; status: 'missing' }
  | { type: 'FILE_KEY'; fileKey: string | null }
  | { type: 'SCOPE_LOADED'; config: Record<AuditCategory, boolean> };

// Messages FROM UI TO sandbox
export type UIMessage =
  | { type: 'START_SCAN'; enabledCategories: AuditCategory[] }
  | { type: 'INJECT_DATA'; enabledCategories: AuditCategory[] }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'TOGGLE_SCOPE'; category: AuditCategory; enabled: boolean };
