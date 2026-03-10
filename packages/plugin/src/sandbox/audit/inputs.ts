/**
 * AuditNode* interfaces — plain-object contracts that auditors accept.
 *
 * These interfaces are the only way auditors receive data from the Figma runtime.
 * The audit/index.ts orchestrator reads Figma types and casts to these interfaces
 * before passing to auditors. This ensures auditors have zero Figma global imports
 * and are independently testable in Vitest (Node environment, no Figma runtime).
 *
 * figma.mixed (PluginAPI['mixed']) is represented as `symbol` for type-safe test simulation.
 */

/** Minimal identity shared by all auditable nodes. */
export interface AuditNode {
  id: string;
  name: string;
  type: string;
}

/** For color auditors: fills, strokes, and bound paint style IDs. */
export interface AuditNodeFills extends AuditNode {
  fills?: ReadonlyArray<{ type: string; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } }> | symbol;
  fillStyleId?: string | symbol;
  strokes?: ReadonlyArray<{ type: string; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } }>;
  strokeStyleId?: string | symbol;
}

/** For typography auditor: text node properties. */
export interface AuditNodeText extends AuditNode {
  textStyleId?: string | symbol;
  fontSize?: number | symbol;
  fontWeight?: number | symbol;
  lineHeight?: { unit: string; value?: number } | symbol;
  letterSpacing?: { unit: string; value: number } | symbol;
  boundVariables?: {
    fontSize?: unknown;
    fontWeight?: unknown;
    lineHeight?: unknown;
    letterSpacing?: unknown;
  };
}

/** For spacing auditor: auto-layout frame properties. */
export interface AuditNodeLayout extends AuditNode {
  layoutMode: string;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  boundVariables?: {
    paddingLeft?: unknown;
    paddingRight?: unknown;
    paddingTop?: unknown;
    paddingBottom?: unknown;
    itemSpacing?: unknown;
  };
}
