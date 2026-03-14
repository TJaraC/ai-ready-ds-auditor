export interface AuditIssue {
  id: string;
  nodeId: string;
  nodeName: string;
  pageName: string;
  category: 'color' | 'typography' | 'spacing' | 'border' | 'effects' | 'component';
  issueType: string;
  offendingValue: string;
  suggestedFix: string;
}

export interface DesignToken {
  id: string;
  name: string;
  type: 'color' | 'typography' | 'spacing' | 'border-radius' | 'border-width' | 'other';
  value: string;
  rawValue: string;
  variableName?: string;
  collectionName?: string;
  groupPath: string[];
}

export interface ComponentSpec {
  id: string;
  name: string;
  key: string;
  description: string;
  variants: string[];
  props: string[];
  usageCount: number;
  publishStatus: 'published' | 'private' | 'local';
}

export interface AuditMeta {
  schemaVersion: string;
  chunkCount: number;
  totalBytes: number;
  fileId: string;
  fileName: string;
  scannedAt: string;
  checksum: string;
}

export interface AuditReport {
  schemaVersion: string;
  fileId: string;
  fileName: string;
  scannedAt: string;
  summary: {
    totalIssues: number;
    totalTokens: number;
    totalComponents: number;
    issuesByCategory: Record<string, number>;
    healthScore: number;
    unpublishedComponents: number;
  };
  issues: AuditIssue[];
  components: ComponentSpec[];
  tokens: DesignToken[];
}

export interface InjectionResult {
  chunkCount: number;
  bytesWritten: number;
}

export interface ChunkPayload {
  chunks: string[];
  totalBytes: number;
  chunkCount: number;
}
