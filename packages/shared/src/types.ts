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

/** Source/origin metadata attached to every extracted property value. */
export interface PropertySource {
  value: string;
  source: 'variable' | 'alias' | 'hardcoded';
  variableName?: string;
}

/** A single fill paint in the layer's fill stack. */
export interface LayerFill {
  type: string; // 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE' | etc.
  value?: string;           // hex color string; omitted for gradient/image fills
  source: 'variable' | 'alias' | 'hardcoded';
  variableName?: string;
}

/** A single stroke paint. */
export interface LayerStroke {
  type: string;
  value?: string;
  source: 'variable' | 'alias' | 'hardcoded';
  variableName?: string;
}

/** Font size property with source metadata. */
export interface LayerFontSize {
  value: number;
  source: string;
  variableName?: string;
}

/** Line height property with source metadata. */
export interface LayerLineHeight {
  value: string; // e.g. '24px', '150%', 'AUTO'
  source: string;
}

/**
 * A single layer in the component tree.
 * Properties are omitted when not applicable to the layer type.
 * VECTOR nodes: only name, type, width, height, fills, opacity (no path geometry).
 */
export interface ComponentLayer {
  name: string;
  type: string; // 'FRAME' | 'GROUP' | 'TEXT' | 'VECTOR' | 'RECTANGLE' | 'COMPONENT' | 'INSTANCE' | etc.
  width: number;
  height: number;
  // Auto-layout (when layoutMode !== 'NONE'):
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  // Visual:
  fills?: LayerFill[];
  strokes?: LayerStroke[];
  strokeWeight?: number;
  cornerRadius?: number | 'mixed';
  opacity?: number;
  visible?: boolean;
  // Text (TEXT nodes only):
  fontSize?: LayerFontSize;
  fontWeight?: { value: string | number; source: string };
  lineHeight?: LayerLineHeight;
  // Recursive children (omitted for leaf nodes):
  children?: ComponentLayer[];
}

/**
 * One state entry in the `states` map.
 * Stores the full layer tree for a specific interaction state variant.
 */
export interface LayerStateEntry {
  layers: ComponentLayer[];
}

/**
 * SVG export record for one component.
 * Exactly one of `svg` or `error` is present — never both, never neither.
 */
export interface SvgRecord {
  componentId: string;
  name: string;
  viewBox?: string;
  svg?: string;    // present on successful export
  error?: string;  // present when exportAsync failed (SVG-03)
}

export interface ComponentSpec {
  id: string;
  name: string;
  key: string;
  description: string;
  publishStatus: 'published' | 'private' | 'local';
  // v2 fields — populated during Phase 11 audit:
  layers: ComponentLayer[];                        // full recursive layer tree
  variants: Record<string, string[]>;              // { Size: ['sm','md','lg'], State: [...] }
  states: Record<string, LayerStateEntry>;         // { default: {layers:[...]}, hover: {layers:[...]} }
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
