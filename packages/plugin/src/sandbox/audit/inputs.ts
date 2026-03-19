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

/** For border auditor: corner radii and stroke weight. */
export interface AuditNodeBorder extends AuditNode {
  cornerRadius?: number | symbol;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  strokes?: ReadonlyArray<unknown>;
  strokeWeight?: number | symbol;
  boundVariables?: {
    topLeftRadius?: unknown;
    topRightRadius?: unknown;
    bottomLeftRadius?: unknown;
    bottomRightRadius?: unknown;
    strokeWeight?: unknown;
  };
}

/** For effects auditor: effects array and effectStyleId. */
export interface AuditNodeEffects extends AuditNode {
  effects?: ReadonlyArray<{ type: string; radius?: number; visible?: boolean }>;
  effectStyleId?: string;
}

/**
 * For layer extraction: a COMPONENT or COMPONENT_SET child node with all
 * visual and structural properties needed to build a ComponentLayer tree.
 *
 * Used by extract-layers.ts — accepts plain objects, not Figma runtime nodes.
 * figma.mixed (Symbol) is represented as `symbol` for type-safe test simulation.
 */
export interface AuditNodeComponent extends AuditNode {
  width: number;
  height: number;
  layoutMode?: string;       // 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  cornerRadius?: number | symbol;  // symbol = figma.mixed
  fills?: ReadonlyArray<{
    type: string;
    color?: { r: number; g: number; b: number };
    boundVariables?: { color?: { type: string; id: string } };
  }> | symbol;
  strokes?: ReadonlyArray<{
    type: string;
    color?: { r: number; g: number; b: number };
    boundVariables?: { color?: { type: string; id: string } };
  }>;
  strokeWeight?: number | symbol;
  opacity?: number;
  visible?: boolean;
  children?: AuditNodeComponent[];
  // Only present on COMPONENT nodes that are children of a COMPONENT_SET:
  variantProperties?: Record<string, string> | null;
  componentSetId?: string | null;
  // TEXT node properties (present when type === 'TEXT'):
  fontSize?: number | symbol;
  fontWeight?: number | symbol;
  lineHeight?: { unit: string; value?: number } | symbol;
  boundVariables?: {
    color?: { type: string; id: string };
    fontSize?: unknown;
    fontWeight?: unknown;
    lineHeight?: unknown;
    fills?: unknown;
  };
}
