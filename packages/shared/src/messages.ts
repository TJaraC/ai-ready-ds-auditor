import type { AuditReport } from './types';

// Messages FROM sandbox TO UI
export type SandboxMessage =
  | { type: 'SCAN_PROGRESS'; percent: number; currentNode: string }
  | { type: 'SCAN_COMPLETE'; report: AuditReport }
  | { type: 'SCAN_ERROR'; message: string }
  | { type: 'INJECT_COMPLETE'; bytesWritten: number; chunkCount: number }
  | { type: 'INJECT_ERROR'; message: string }
  | { type: 'SYNC_OUTDATED'; lastScannedAt: string }
  | { type: 'CONTEXT_STATUS_CHECK'; status: 'missing' }
  | { type: 'FILE_KEY'; fileKey: string | null };

// Messages FROM UI TO sandbox
export type UIMessage =
  | { type: 'START_SCAN' }
  | { type: 'INJECT_DATA' }
  | { type: 'SELECT_NODE'; nodeId: string };
