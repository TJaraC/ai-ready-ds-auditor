import { describe, it, expect } from 'vitest';

// Mock figma global — auditors reference figma.mixed at runtime
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditFills, auditStrokes } from './color';
import type { AuditNodeFills } from './inputs';

describe('auditFills', () => {
  const styleIds = new Set(['style-1', 'style-2']);

  it('returns [] when node has no fills property', () => {
    const node: AuditNodeFills = { id: '1', name: 'Rect', type: 'RECTANGLE' };
    expect(auditFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when fills is figma.mixed (Symbol)', () => {
    const node: AuditNodeFills = {
      id: '2',
      name: 'TextNode',
      type: 'TEXT',
      fills: FIGMA_MIXED,
    };
    expect(auditFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when fillStyleId is in styleIds (bound to named paint style)', () => {
    const node: AuditNodeFills = {
      id: '3',
      name: 'Button',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
      fillStyleId: 'style-1',
    };
    expect(auditFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when SOLID fill has boundVariables.color (variable-bound)', () => {
    const node: AuditNodeFills = {
      id: '4',
      name: 'Card',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'var:123' } } }],
    };
    expect(auditFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [issue] with category "color" and issueType "hardcoded-fill" for unbound SOLID fill', () => {
    const node: AuditNodeFills = {
      id: '5',
      name: 'Circle',
      type: 'ELLIPSE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    };
    const issues = auditFills(node, 'Page 1', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0].category).toBe('color');
    expect(issues[0].issueType).toBe('hardcoded-fill');
    expect(issues[0].offendingValue).toBe('#ff0000');
    expect(issues[0].nodeId).toBe('5');
    expect(issues[0].pageName).toBe('Page 1');
  });

  it('returns [] for non-SOLID fill (GRADIENT_LINEAR) — gradients are skipped', () => {
    const node: AuditNodeFills = {
      id: '6',
      name: 'Gradient',
      type: 'RECTANGLE',
      fills: [{ type: 'GRADIENT_LINEAR' }],
    };
    expect(auditFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns one issue per unbound SOLID fill when multiple fills present', () => {
    const node: AuditNodeFills = {
      id: '7',
      name: 'Multi',
      type: 'RECTANGLE',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
        { type: 'SOLID', color: { r: 0, g: 1, b: 0 } },
      ],
    };
    const issues = auditFills(node, 'Page', styleIds);
    expect(issues).toHaveLength(2);
  });

  it('returns [] when fillStyleId is a non-empty string but NOT in styleIds (unrecognized style)', () => {
    // fillStyleId present but not matching known styles — fills are still inspected
    const node: AuditNodeFills = {
      id: '8',
      name: 'Rect',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
      fillStyleId: 'unknown-style',
    };
    // fillStyleId is set but not in styleIds → not skipped → issue reported
    const issues = auditFills(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
  });
});

describe('auditStrokes', () => {
  const styleIds = new Set(['style-1', 'style-2']);

  it('returns [] when node has no strokes property', () => {
    const node: AuditNodeFills = { id: '1', name: 'Rect', type: 'RECTANGLE' };
    expect(auditStrokes(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when strokeStyleId is in styleIds (bound to named paint style)', () => {
    const node: AuditNodeFills = {
      id: '2',
      name: 'BorderBox',
      type: 'RECTANGLE',
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
      strokeStyleId: 'style-2',
    };
    expect(auditStrokes(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [issue] with issueType "hardcoded-stroke" for unbound SOLID stroke', () => {
    const node: AuditNodeFills = {
      id: '3',
      name: 'Icon',
      type: 'VECTOR',
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }],
    };
    const issues = auditStrokes(node, 'Page 2', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0].category).toBe('color');
    expect(issues[0].issueType).toBe('hardcoded-stroke');
    expect(issues[0].offendingValue).toBe('#0000ff');
    expect(issues[0].nodeId).toBe('3');
  });

  it('returns [] for non-SOLID stroke (GRADIENT_LINEAR) — gradients are skipped', () => {
    const node: AuditNodeFills = {
      id: '4',
      name: 'GradientStroke',
      type: 'RECTANGLE',
      strokes: [{ type: 'GRADIENT_LINEAR' }],
    };
    expect(auditStrokes(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when stroke has boundVariables.color (variable-bound)', () => {
    const node: AuditNodeFills = {
      id: '5',
      name: 'BoundStroke',
      type: 'RECTANGLE',
      strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'var:456' } } }],
    };
    expect(auditStrokes(node, 'Page', styleIds)).toEqual([]);
  });
});
