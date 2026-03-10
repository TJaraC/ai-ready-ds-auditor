import { describe, it, expect } from 'vitest';

// Mock figma global — required for Node test environment consistency
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditSpacing } from './spacing';
import type { AuditNodeLayout } from './inputs';

const baseNode: AuditNodeLayout = {
  id: '1',
  name: 'Frame',
  type: 'FRAME',
  layoutMode: 'HORIZONTAL',
  paddingLeft: 0,
  paddingRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  itemSpacing: 0,
};

describe('auditSpacing', () => {
  it('returns [] when layoutMode is NONE (no auto-layout)', () => {
    const node: AuditNodeLayout = { ...baseNode, layoutMode: 'NONE' };
    expect(auditSpacing(node, 'Page')).toEqual([]);
  });

  it('returns [] when layoutMode is HORIZONTAL and all values are zero', () => {
    const node: AuditNodeLayout = { ...baseNode, layoutMode: 'HORIZONTAL' };
    expect(auditSpacing(node, 'Page')).toEqual([]);
  });

  it('returns [] when layoutMode is VERTICAL and all values are zero', () => {
    const node: AuditNodeLayout = { ...baseNode, layoutMode: 'VERTICAL' };
    expect(auditSpacing(node, 'Page')).toEqual([]);
  });

  it('reports hardcoded-paddingLeft when paddingLeft is non-zero and unbound', () => {
    const node: AuditNodeLayout = { ...baseNode, layoutMode: 'VERTICAL', paddingLeft: 16 };
    const issues = auditSpacing(node, 'Page 1');
    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe('hardcoded-paddingLeft');
    expect(issues[0].offendingValue).toBe('16');
    expect(issues[0].category).toBe('spacing');
    expect(issues[0].pageName).toBe('Page 1');
  });

  it('returns [] for paddingLeft when boundVariables.paddingLeft is present', () => {
    const node: AuditNodeLayout = {
      ...baseNode,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 16,
      boundVariables: { paddingLeft: { type: 'VARIABLE_ALIAS', id: 'var:padding' } },
    };
    const issues = auditSpacing(node, 'Page');
    expect(issues.find(i => i.issueType === 'hardcoded-paddingLeft')).toBeUndefined();
  });

  it('reports one issue per unbound non-zero spacing field', () => {
    const node: AuditNodeLayout = {
      ...baseNode,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 16,
      paddingBottom: 16,
      itemSpacing: 4,
    };
    const issues = auditSpacing(node, 'Page');
    expect(issues).toHaveLength(5);
    const types = issues.map(i => i.issueType);
    expect(types).toContain('hardcoded-paddingLeft');
    expect(types).toContain('hardcoded-paddingRight');
    expect(types).toContain('hardcoded-paddingTop');
    expect(types).toContain('hardcoded-paddingBottom');
    expect(types).toContain('hardcoded-itemSpacing');
  });

  it('skips bound fields and reports only unbound non-zero fields', () => {
    const node: AuditNodeLayout = {
      ...baseNode,
      layoutMode: 'VERTICAL',
      paddingLeft: 16,
      paddingRight: 16,
      itemSpacing: 8,
      boundVariables: {
        paddingLeft: { type: 'VARIABLE_ALIAS', id: 'var:pl' },
        paddingRight: { type: 'VARIABLE_ALIAS', id: 'var:pr' },
      },
    };
    const issues = auditSpacing(node, 'Page');
    // paddingTop=0 and paddingBottom=0 are skipped (zero), bound fields skipped
    // only itemSpacing=8 is unbound non-zero
    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe('hardcoded-itemSpacing');
  });

  it('reports hardcoded-itemSpacing for non-zero unbound gap in HORIZONTAL layout', () => {
    const node: AuditNodeLayout = { ...baseNode, layoutMode: 'HORIZONTAL', itemSpacing: 12 };
    const issues = auditSpacing(node, 'Page');
    expect(issues).toHaveLength(1);
    expect(issues[0].issueType).toBe('hardcoded-itemSpacing');
    expect(issues[0].offendingValue).toBe('12');
  });
});
