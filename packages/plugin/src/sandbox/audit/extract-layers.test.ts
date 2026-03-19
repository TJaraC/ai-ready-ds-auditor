import { describe, it, expect } from 'vitest';

// Figma global mock — must precede all imports that transitively reference figma.mixed
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { extractLayerTree, getVariantMap, buildStatesMap, resolveFillSourceSync } from './extract-layers';
import { serializeSvgStore } from '../serialize-svgs';
import type { AuditNodeComponent } from './inputs';

// ---------------------------------------------------------------------------
// SPEC-01: extractLayerTree
// ---------------------------------------------------------------------------

describe('extractLayerTree — basic node', () => {
  it('returns a ComponentLayer for a COMPONENT node with a solid fill (hardcoded)', () => {
    const node: AuditNodeComponent = {
      id: 'btn-1',
      name: 'Button',
      type: 'COMPONENT',
      width: 120,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1 } }],
    };
    const [layer] = extractLayerTree(node).children ?? [extractLayerTree(node)];
    // extractLayerTree returns a single ComponentLayer (not an array)
    const result = extractLayerTree(node);
    expect(result.name).toBe('Button');
    expect(result.type).toBe('COMPONENT');
    expect(result.width).toBe(120);
    expect(result.height).toBe(40);
    expect(result.fills).toHaveLength(1);
    expect(result.fills![0]!.type).toBe('SOLID');
    expect(result.fills![0]!.source).toBe('hardcoded');
    expect(result.fills![0]!.value).toBe('#3366ff');
  });

  it('recurses into children: node with 2 children returns layer with children of length 2', () => {
    const child1: AuditNodeComponent = { id: 'c1', name: 'Icon', type: 'VECTOR', width: 24, height: 24 };
    const child2: AuditNodeComponent = { id: 'c2', name: 'Label', type: 'TEXT', width: 80, height: 20 };
    const parent: AuditNodeComponent = {
      id: 'p1',
      name: 'ButtonInner',
      type: 'FRAME',
      width: 120,
      height: 40,
      children: [child1, child2],
    };
    const result = extractLayerTree(parent);
    expect(result.children).toHaveLength(2);
    expect(result.children![0]!.name).toBe('Icon');
    expect(result.children![1]!.name).toBe('Label');
  });

  it('omits paddingLeft/Right/Top/Bottom/itemSpacing when layoutMode is absent', () => {
    const node: AuditNodeComponent = {
      id: 'n1',
      name: 'Group',
      type: 'GROUP',
      width: 100,
      height: 50,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
      itemSpacing: 12,
    };
    const result = extractLayerTree(node);
    expect(result.paddingLeft).toBeUndefined();
    expect(result.paddingRight).toBeUndefined();
    expect(result.paddingTop).toBeUndefined();
    expect(result.paddingBottom).toBeUndefined();
    expect(result.itemSpacing).toBeUndefined();
  });

  it('omits padding/spacing when layoutMode is NONE', () => {
    const node: AuditNodeComponent = {
      id: 'n2',
      name: 'NoLayout',
      type: 'FRAME',
      width: 100,
      height: 50,
      layoutMode: 'NONE',
      paddingLeft: 16,
    };
    const result = extractLayerTree(node);
    expect(result.paddingLeft).toBeUndefined();
  });

  it('includes padding/spacing when layoutMode is HORIZONTAL', () => {
    const node: AuditNodeComponent = {
      id: 'n3',
      name: 'Row',
      type: 'FRAME',
      width: 200,
      height: 48,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 8,
      paddingBottom: 8,
      itemSpacing: 12,
    };
    const result = extractLayerTree(node);
    expect(result.paddingLeft).toBe(16);
    expect(result.paddingRight).toBe(16);
    expect(result.paddingTop).toBe(8);
    expect(result.paddingBottom).toBe(8);
    expect(result.itemSpacing).toBe(12);
  });

  it('VECTOR node: returns layer with name, type, width, height — no children field', () => {
    const vectorWithChild: AuditNodeComponent = {
      id: 'v1',
      name: 'Path',
      type: 'VECTOR',
      width: 24,
      height: 24,
      children: [{ id: 'c1', name: 'sub', type: 'VECTOR', width: 5, height: 5 }],
    };
    const result = extractLayerTree(vectorWithChild);
    expect(result.type).toBe('VECTOR');
    expect(result.children).toBeUndefined();
  });

  it('cornerRadius: symbol → mixed', () => {
    const node: AuditNodeComponent = {
      id: 'cr1',
      name: 'Card',
      type: 'FRAME',
      width: 100,
      height: 100,
      cornerRadius: FIGMA_MIXED,
    };
    const result = extractLayerTree(node);
    expect(result.cornerRadius).toBe('mixed');
  });

  it('cornerRadius: number → number', () => {
    const node: AuditNodeComponent = {
      id: 'cr2',
      name: 'Card',
      type: 'FRAME',
      width: 100,
      height: 100,
      cornerRadius: 8,
    };
    const result = extractLayerTree(node);
    expect(result.cornerRadius).toBe(8);
  });

  it('cornerRadius: absent → omitted from layer', () => {
    const node: AuditNodeComponent = { id: 'cr3', name: 'Rect', type: 'RECTANGLE', width: 50, height: 20 };
    const result = extractLayerTree(node);
    expect(result.cornerRadius).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SPEC-03: resolveFillSourceSync
// ---------------------------------------------------------------------------

describe('resolveFillSourceSync', () => {
  it('returns source:variable + variableName when boundVariables.color is present and resolved', () => {
    const fill = {
      type: 'SOLID',
      color: { r: 0.2, g: 0.4, b: 1 },
      boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'abc' } },
    };
    const resolvedVars = new Map([['abc', { name: 'color/primary', hex: '#3366ff' }]]);
    const result = resolveFillSourceSync(fill, resolvedVars);
    expect(result.source).toBe('variable');
    expect(result.variableName).toBe('color/primary');
    expect(result.value).toBe('#3366ff');
  });

  it('returns source:hardcoded + hex when no boundVariables.color', () => {
    const fill = {
      type: 'SOLID',
      color: { r: 0.2, g: 0.4, b: 1 },
    };
    const result = resolveFillSourceSync(fill, new Map());
    expect(result.source).toBe('hardcoded');
    expect(result.value).toBe('#3366ff');
    expect(result.variableName).toBeUndefined();
  });

  it('falls back to hardcoded when alias id is not in the resolved map', () => {
    const fill = {
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0 },
      boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'unknown-id' } },
    };
    const result = resolveFillSourceSync(fill, new Map());
    expect(result.source).toBe('hardcoded');
    expect(result.value).toBe('#ff0000');
  });
});

// ---------------------------------------------------------------------------
// SPEC-02: getVariantMap
// ---------------------------------------------------------------------------

describe('getVariantMap', () => {
  it('returns correct Record<string, string[]> for VARIANT type entries', () => {
    const compSet = {
      componentPropertyDefinitions: {
        Size: { type: 'VARIANT', variantOptions: ['sm', 'md', 'lg'] },
        State: { type: 'VARIANT', variantOptions: ['default', 'hover', 'pressed'] },
      },
    };
    const result = getVariantMap(compSet);
    expect(result['Size']).toEqual(['sm', 'md', 'lg']);
    expect(result['State']).toEqual(['default', 'hover', 'pressed']);
  });

  it('excludes BOOLEAN, TEXT, INSTANCE_SWAP entries', () => {
    const compSet = {
      componentPropertyDefinitions: {
        Disabled: { type: 'BOOLEAN' },
        Label: { type: 'TEXT' },
        Icon: { type: 'INSTANCE_SWAP' },
        State: { type: 'VARIANT', variantOptions: ['on', 'off'] },
      },
    };
    const result = getVariantMap(compSet);
    expect(Object.keys(result)).toEqual(['State']);
    expect(result['Disabled']).toBeUndefined();
    expect(result['Label']).toBeUndefined();
    expect(result['Icon']).toBeUndefined();
  });

  it('returns {} when no componentPropertyDefinitions', () => {
    const result = getVariantMap({});
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// SPEC-02 (states): buildStatesMap
// ---------------------------------------------------------------------------

describe('buildStatesMap', () => {
  it('returns state entries keyed by state value for State property with 2 values', () => {
    const defaultNode: AuditNodeComponent = {
      id: 's1',
      name: 'Button/State=default',
      type: 'COMPONENT',
      width: 120,
      height: 40,
      variantProperties: { State: 'default' },
    };
    const hoverNode: AuditNodeComponent = {
      id: 's2',
      name: 'Button/State=hover',
      type: 'COMPONENT',
      width: 120,
      height: 40,
      variantProperties: { State: 'hover' },
    };
    const siblings = [defaultNode, hoverNode];
    const result = buildStatesMap('State', ['default', 'hover'], siblings);
    expect(Object.keys(result)).toContain('default');
    expect(Object.keys(result)).toContain('hover');
    expect(result['default']!.layers).toHaveLength(1);
    expect(result['hover']!.layers).toHaveLength(1);
    expect(result['default']!.layers[0]!.name).toBe('Button/State=default');
  });

  it('returns {} when no matching state siblings exist', () => {
    const result = buildStatesMap('State', ['default', 'hover'], []);
    expect(result).toEqual({});
  });

  it('each LayerStateEntry has a layers array from extractLayerTree on the matching child', () => {
    const pressedNode: AuditNodeComponent = {
      id: 'p1',
      name: 'Btn/pressed',
      type: 'COMPONENT',
      width: 80,
      height: 32,
      variantProperties: { Interaction: 'pressed' },
    };
    const result = buildStatesMap('Interaction', ['pressed'], [pressedNode]);
    expect(result['pressed']!.layers[0]!.width).toBe(80);
    expect(result['pressed']!.layers[0]!.height).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// SVG-01: serializeSvgStore
// ---------------------------------------------------------------------------

describe('serializeSvgStore', () => {
  it('empty array → { chunks: [\'[]\'], chunkCount: 1 }', () => {
    const result = serializeSvgStore([]);
    expect(result.chunkCount).toBe(1);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toBe('[]');
  });

  it('returns { chunks, totalBytes, chunkCount } shape', () => {
    const records = [{ componentId: 'c1', name: 'Button', svg: '<svg/>', viewBox: '0 0 24 24' }];
    const result = serializeSvgStore(records);
    expect(typeof result.chunkCount).toBe('number');
    expect(typeof result.totalBytes).toBe('number');
    expect(Array.isArray(result.chunks)).toBe(true);
    expect(result.chunkCount).toBeGreaterThanOrEqual(1);
  });

  it('200 records with ~500-char SVGs → all content recoverable via JSON.parse(chunks.join(""))', () => {
    const svgStr = '<svg viewBox="0 0 24 24">' + 'x'.repeat(480) + '</svg>';
    const records = Array.from({ length: 200 }, (_, i) => ({
      componentId: `c${i}`,
      name: `Component${i}`,
      svg: svgStr,
      viewBox: '0 0 24 24',
    }));
    const result = serializeSvgStore(records);
    expect(result.chunks.length).toBeGreaterThanOrEqual(1);
    const recovered = JSON.parse(result.chunks.join('')) as typeof records;
    expect(recovered).toHaveLength(200);
    expect(recovered[0]!.componentId).toBe('c0');
    expect(recovered[199]!.name).toBe('Component199');
  });
});
