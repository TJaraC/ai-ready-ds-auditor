/**
 * extract-layers.ts — Pure layer extraction functions for ComponentSpec v2.
 *
 * Zero Figma globals — all functions are independently testable in Vitest.
 * figma.mixed (Symbol) accessed via (globalThis as ...).figma.mixed for test compatibility.
 *
 * Exports:
 *   extractLayerTree  — recursively builds a ComponentLayer tree from AuditNodeComponent
 *   getVariantMap     — extracts VARIANT-type properties from a COMPONENT_SET node
 *   buildStatesMap    — builds the states map keyed by state/interaction property values
 *   resolveFillSourceSync — resolves a single fill's source/value against a pre-resolved variable map
 *   findStatePropertyName — returns 'State' or 'Interaction' if present, else null
 *   extractViewBox    — regex helper to extract viewBox from an SVG string
 */

import type { ComponentLayer, LayerFill, LayerStroke } from '@shared/types';
import type { AuditNodeComponent } from './inputs';
import { rgbToHex } from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns 'State' or 'Interaction' property name if present in the variant map, else null.
 * Used to detect which variant property represents interaction states.
 */
export function findStatePropertyName(variants: Record<string, string[]>): string | null {
  if ('State' in variants) return 'State';
  if ('Interaction' in variants) return 'Interaction';
  return null;
}

/**
 * Extracts viewBox from an SVG string using regex.
 * Returns undefined when no viewBox attribute is found.
 */
export function extractViewBox(svg: string): string | undefined {
  return svg.match(/viewBox="([^"]+)"/)?.[1];
}

// ---------------------------------------------------------------------------
// SPEC-02: getVariantMap
// ---------------------------------------------------------------------------

/**
 * Builds the variant map from componentPropertyDefinitions on a COMPONENT_SET.
 * Only VARIANT-type entries are included — BOOLEAN, TEXT, INSTANCE_SWAP are excluded.
 */
export function getVariantMap(
  compSet: { componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[] }> }
): Record<string, string[]> {
  const defs = compSet.componentPropertyDefinitions ?? {};
  const result: Record<string, string[]> = {};
  for (const [name, def] of Object.entries(defs)) {
    if (def.type === 'VARIANT' && Array.isArray(def.variantOptions)) {
      result[name] = def.variantOptions;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// SPEC-03: resolveFillSourceSync
// ---------------------------------------------------------------------------

/**
 * Resolves a single fill's source/value synchronously.
 * The caller passes a pre-resolved variable map (id → { name, hex }) to avoid async lookups.
 */
export function resolveFillSourceSync(
  fill: { type: string; color?: { r: number; g: number; b: number }; boundVariables?: { color?: { type: string; id: string } } },
  resolvedVariables: Map<string, { name: string; hex: string }>
): LayerFill {
  const alias = fill.boundVariables?.color;
  if (alias) {
    const resolved = resolvedVariables.get(alias.id);
    if (resolved) {
      return { type: fill.type, value: resolved.hex, source: 'variable', variableName: resolved.name };
    }
  }
  const hex = fill.color ? rgbToHex(fill.color) : '#000000';
  return { type: fill.type, value: hex, source: 'hardcoded' };
}

// ---------------------------------------------------------------------------
// SPEC-01: extractLayerTree
// ---------------------------------------------------------------------------

/**
 * Extracts a ComponentLayer tree from an AuditNodeComponent.
 * Pure, sync, no Figma globals — testable in Node/Vitest.
 *
 * resolvedVariables: pre-resolved variable map (id → {name, hex}) for fill/stroke source resolution.
 *                    Defaults to empty map; Pass 2 in index.ts should populate via async lookup.
 */
export function extractLayerTree(
  node: AuditNodeComponent,
  resolvedVariables: Map<string, { name: string; hex: string }> = new Map()
): ComponentLayer {
  // Access figma.mixed through globalThis for test environment compatibility
  const mixedSymbol = (globalThis as unknown as { figma?: { mixed: symbol } }).figma?.mixed;

  const layer: ComponentLayer = {
    name: node.name,
    type: node.type,
    width: node.width,
    height: node.height,
  };

  // Auto-layout padding/spacing — only when layoutMode is set and not 'NONE'
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    if (node.paddingLeft !== undefined) layer.paddingLeft = node.paddingLeft;
    if (node.paddingRight !== undefined) layer.paddingRight = node.paddingRight;
    if (node.paddingTop !== undefined) layer.paddingTop = node.paddingTop;
    if (node.paddingBottom !== undefined) layer.paddingBottom = node.paddingBottom;
    if (node.itemSpacing !== undefined) layer.itemSpacing = node.itemSpacing;
  }

  // cornerRadius: symbol → 'mixed', number → number, undefined → omit field
  if (node.cornerRadius !== undefined) {
    const isMixed = typeof node.cornerRadius === 'symbol' ||
      (mixedSymbol !== undefined && node.cornerRadius === mixedSymbol);
    layer.cornerRadius = isMixed ? 'mixed' : (node.cornerRadius as number);
  }

  // Fills — skip if fills is a symbol (figma.mixed) or undefined
  if (node.fills !== undefined) {
    const fillsIsMixed = typeof node.fills === 'symbol' ||
      (mixedSymbol !== undefined && (node.fills as unknown) === mixedSymbol);
    if (!fillsIsMixed) {
      layer.fills = (node.fills as ReadonlyArray<{
        type: string;
        color?: { r: number; g: number; b: number };
        boundVariables?: { color?: { type: string; id: string } };
      }>).map((f) => resolveFillSourceSync(f, resolvedVariables));
    }
  }

  // Strokes — skip if strokes is undefined or empty
  if (node.strokes && node.strokes.length > 0) {
    layer.strokes = node.strokes.map((s): LayerStroke => {
      const alias = s.boundVariables?.color;
      const sColor = s.color;
      if (alias) {
        const resolved = resolvedVariables.get(alias.id);
        if (resolved) {
          return { type: s.type, value: resolved.hex, source: 'variable', variableName: resolved.name };
        }
      }
      return { type: s.type, value: sColor ? rgbToHex(sColor) : '#000000', source: 'hardcoded' };
    });
  }

  // strokeWeight — only when it's a number (skip symbol/mixed)
  if (node.strokeWeight !== undefined && typeof node.strokeWeight === 'number') {
    layer.strokeWeight = node.strokeWeight;
  }

  // opacity / visible
  if (node.opacity !== undefined) layer.opacity = node.opacity;
  if (node.visible !== undefined) layer.visible = node.visible;

  // Text properties (TEXT nodes only)
  if (node.type === 'TEXT') {
    if (node.fontSize !== undefined && typeof node.fontSize === 'number') {
      layer.fontSize = { value: node.fontSize, source: 'hardcoded' };
    }
    if (node.fontWeight !== undefined && typeof node.fontWeight === 'number') {
      layer.fontWeight = { value: node.fontWeight, source: 'hardcoded' };
    }
    if (node.lineHeight && typeof node.lineHeight === 'object' && 'unit' in node.lineHeight) {
      const lh = node.lineHeight as { unit: string; value?: number };
      const lhStr =
        lh.unit === 'AUTO' ? 'AUTO' :
        lh.unit === 'PERCENT' ? `${lh.value}%` :
        `${lh.value}px`;
      layer.lineHeight = { value: lhStr, source: 'hardcoded' };
    }
  }

  // Children — omit for VECTOR nodes (no path geometry, no children)
  if (node.type !== 'VECTOR' && node.children && node.children.length > 0) {
    layer.children = node.children.map((child) => extractLayerTree(child, resolvedVariables));
  }

  return layer;
}

// ---------------------------------------------------------------------------
// SPEC-02 (states): buildStatesMap
// ---------------------------------------------------------------------------

/**
 * Builds the states map for the interaction states of a component in a COMPONENT_SET.
 *
 * statePropertyName: 'State' or 'Interaction'
 * stateValues:       all values of that property (from variantMap[statePropertyName])
 * siblings:          all COMPONENT children of the COMPONENT_SET (each has variantProperties)
 * resolvedVariables: pre-resolved variable map, forwarded to extractLayerTree
 */
export function buildStatesMap(
  statePropertyName: string,
  stateValues: string[],
  siblings: Array<AuditNodeComponent & { variantProperties?: Record<string, string> | null }>,
  resolvedVariables: Map<string, { name: string; hex: string }> = new Map()
): Record<string, { layers: ComponentLayer[] }> {
  const states: Record<string, { layers: ComponentLayer[] }> = {};
  for (const stateValue of stateValues) {
    const stateNode = siblings.find(
      (child) => child.variantProperties?.[statePropertyName] === stateValue
    );
    if (stateNode) {
      states[stateValue] = { layers: [extractLayerTree(stateNode, resolvedVariables)] };
    }
  }
  return states;
}
