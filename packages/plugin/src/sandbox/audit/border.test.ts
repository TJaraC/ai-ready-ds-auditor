import { describe, it, expect } from 'vitest';

// Mock figma global — auditors reference figma.mixed at runtime
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditBorderShape } from './border';
import type { AuditNodeBorder } from './inputs';

describe('auditBorderShape — cornerRadius (uniform)', () => {
  it('returns [] when node has no cornerRadius property', () => {
    const node: AuditNodeBorder = { id: '1', name: 'Text', type: 'TEXT' };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [] when cornerRadius is 0', () => {
    const node: AuditNodeBorder = { id: '2', name: 'Rect', type: 'RECTANGLE', cornerRadius: 0 };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [issue] for hardcoded cornerRadius', () => {
    const node: AuditNodeBorder = { id: '3', name: 'Button', type: 'RECTANGLE', cornerRadius: 8 };
    const issues = auditBorderShape(node, 'Page 1');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('border');
    expect(issues[0]!.issueType).toBe('hardcoded-cornerRadius');
    expect(issues[0]!.offendingValue).toBe('8px');
    expect(issues[0]!.nodeId).toBe('3');
    expect(issues[0]!.pageName).toBe('Page 1');
  });

  it('returns [] when cornerRadius is bound (topLeftRadius binding is proxy for all)', () => {
    const node: AuditNodeBorder = {
      id: '4',
      name: 'Card',
      type: 'RECTANGLE',
      cornerRadius: 12,
      boundVariables: { topLeftRadius: { type: 'VARIABLE_ALIAS', id: 'var:r' } },
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [] when cornerRadius is bound via any corner binding', () => {
    const node: AuditNodeBorder = {
      id: '5',
      name: 'Card',
      type: 'RECTANGLE',
      cornerRadius: 12,
      boundVariables: { bottomRightRadius: { type: 'VARIABLE_ALIAS', id: 'var:r' } },
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });
});

describe('auditBorderShape — cornerRadius (figma.mixed individual corners)', () => {
  it('returns one issue per unbound non-zero corner', () => {
    const node: AuditNodeBorder = {
      id: '6',
      name: 'Asymmetric',
      type: 'RECTANGLE',
      cornerRadius: FIGMA_MIXED,
      topLeftRadius: 8,
      topRightRadius: 0,
      bottomLeftRadius: 4,
      bottomRightRadius: 0,
    };
    const issues = auditBorderShape(node, 'Page');
    expect(issues).toHaveLength(2);
    expect(issues[0]!.issueType).toBe('hardcoded-cornerRadius');
    expect(issues[0]!.offendingValue).toBe('8px (topLeftRadius)');
    expect(issues[1]!.offendingValue).toBe('4px (bottomLeftRadius)');
  });

  it('returns [] when all non-zero corners are variable-bound', () => {
    const node: AuditNodeBorder = {
      id: '7',
      name: 'BoundCorners',
      type: 'RECTANGLE',
      cornerRadius: FIGMA_MIXED,
      topLeftRadius: 8,
      topRightRadius: 0,
      bottomLeftRadius: 8,
      bottomRightRadius: 0,
      boundVariables: {
        topLeftRadius: { type: 'VARIABLE_ALIAS', id: 'var:r1' },
        bottomLeftRadius: { type: 'VARIABLE_ALIAS', id: 'var:r2' },
      },
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns issue only for unbound corners when some are bound and some are not', () => {
    const node: AuditNodeBorder = {
      id: '8',
      name: 'MixedBinding',
      type: 'RECTANGLE',
      cornerRadius: FIGMA_MIXED,
      topLeftRadius: 8,
      topRightRadius: 8,
      bottomLeftRadius: 0,
      bottomRightRadius: 0,
      boundVariables: {
        topLeftRadius: { type: 'VARIABLE_ALIAS', id: 'var:r' },
      },
    };
    const issues = auditBorderShape(node, 'Page');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.offendingValue).toBe('8px (topRightRadius)');
  });
});

describe('auditBorderShape — strokeWeight', () => {
  it('returns [] when node has no strokes', () => {
    const node: AuditNodeBorder = {
      id: '9',
      name: 'Rect',
      type: 'RECTANGLE',
      strokeWeight: 2,
      strokes: [],
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [issue] for hardcoded strokeWeight when strokes are present', () => {
    const node: AuditNodeBorder = {
      id: '10',
      name: 'Rect',
      type: 'RECTANGLE',
      strokeWeight: 2,
      strokes: [{}],
    };
    const issues = auditBorderShape(node, 'Page');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('border');
    expect(issues[0]!.issueType).toBe('hardcoded-strokeWeight');
    expect(issues[0]!.offendingValue).toBe('2px');
  });

  it('returns [] when strokeWeight is bound to a variable', () => {
    const node: AuditNodeBorder = {
      id: '11',
      name: 'Rect',
      type: 'RECTANGLE',
      strokeWeight: 2,
      strokes: [{}],
      boundVariables: { strokeWeight: { type: 'VARIABLE_ALIAS', id: 'var:sw' } },
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [] when strokeWeight is 0', () => {
    const node: AuditNodeBorder = {
      id: '12',
      name: 'Rect',
      type: 'RECTANGLE',
      strokeWeight: 0,
      strokes: [{}],
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });

  it('returns [] when strokeWeight is figma.mixed', () => {
    const node: AuditNodeBorder = {
      id: '13',
      name: 'Rect',
      type: 'RECTANGLE',
      strokeWeight: FIGMA_MIXED,
      strokes: [{}],
    };
    expect(auditBorderShape(node, 'Page')).toEqual([]);
  });
});
