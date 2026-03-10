import { describe, it, expect } from 'vitest';

// Mock figma global — auditTypography references figma.mixed at runtime
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditTypography } from './typography';
import type { AuditNodeText } from './inputs';

describe('auditTypography', () => {
  const styleIds = new Set(['ts-1', 'ts-2']);

  it('returns [] when node has textStyleId in styleIds (bound to named text style)', () => {
    const node: AuditNodeText = {
      id: '1',
      name: 'Heading',
      type: 'TEXT',
      textStyleId: 'ts-1',
      fontSize: 24,
    };
    expect(auditTypography(node, 'Page', styleIds)).toEqual([]);
  });

  it('reports hardcoded-fontSize when textStyleId is figma.mixed and fontSize is unbound', () => {
    const node: AuditNodeText = {
      id: '2',
      name: 'MixedText',
      type: 'TEXT',
      textStyleId: FIGMA_MIXED,
      fontSize: 16,
    };
    const issues = auditTypography(node, 'Page', styleIds);
    const fontSizeIssue = issues.find(i => i.issueType === 'hardcoded-fontSize');
    expect(fontSizeIssue).toBeDefined();
    expect(fontSizeIssue!.category).toBe('typography');
  });

  it('reports both hardcoded-fontSize and hardcoded-fontWeight when both are unbound', () => {
    const node: AuditNodeText = {
      id: '3',
      name: 'PlainText',
      type: 'TEXT',
      fontSize: 14,
      fontWeight: 400,
    };
    const issues = auditTypography(node, 'Page', styleIds);
    const types = issues.map(i => i.issueType);
    expect(types).toContain('hardcoded-fontSize');
    expect(types).toContain('hardcoded-fontWeight');
  });

  it('does not report hardcoded-fontWeight when fontSize is bound (no noise rule)', () => {
    const node: AuditNodeText = {
      id: '4',
      name: 'PartBound',
      type: 'TEXT',
      fontSize: 16,
      fontWeight: 700,
      boundVariables: { fontSize: { type: 'VARIABLE_ALIAS', id: 'var:fs' } },
    };
    const issues = auditTypography(node, 'Page', styleIds);
    const types = issues.map(i => i.issueType);
    expect(types).not.toContain('hardcoded-fontWeight');
    // fontSize is bound so no fontSize issue either
    expect(types).not.toContain('hardcoded-fontSize');
  });

  it('returns [] for lineHeight with unit AUTO (intentional default)', () => {
    const node: AuditNodeText = {
      id: '5',
      name: 'AutoLH',
      type: 'TEXT',
      textStyleId: 'ts-1',
      lineHeight: { unit: 'AUTO' },
    };
    const issues = auditTypography(node, 'Page', styleIds);
    expect(issues.find(i => i.issueType === 'hardcoded-lineHeight')).toBeUndefined();
  });

  it('reports hardcoded-lineHeight when lineHeight is PIXELS and unbound', () => {
    const node: AuditNodeText = {
      id: '6',
      name: 'FixedLH',
      type: 'TEXT',
      lineHeight: { unit: 'PIXELS', value: 16 },
    };
    const issues = auditTypography(node, 'Page', styleIds);
    const lhIssue = issues.find(i => i.issueType === 'hardcoded-lineHeight');
    expect(lhIssue).toBeDefined();
    expect(lhIssue!.offendingValue).toBe('16px');
  });

  it('returns [] for letterSpacing with value 0 (normal default)', () => {
    const node: AuditNodeText = {
      id: '7',
      name: 'ZeroLS',
      type: 'TEXT',
      textStyleId: 'ts-1',
      letterSpacing: { unit: 'PIXELS', value: 0 },
    };
    const issues = auditTypography(node, 'Page', styleIds);
    expect(issues.find(i => i.issueType === 'hardcoded-letterSpacing')).toBeUndefined();
  });

  it('reports hardcoded-letterSpacing when value is non-zero and unbound', () => {
    const node: AuditNodeText = {
      id: '8',
      name: 'TrackText',
      type: 'TEXT',
      letterSpacing: { unit: 'PIXELS', value: 1.5 },
    };
    const issues = auditTypography(node, 'Page', styleIds);
    const lsIssue = issues.find(i => i.issueType === 'hardcoded-letterSpacing');
    expect(lsIssue).toBeDefined();
    expect(lsIssue!.offendingValue).toBe('1.5px');
  });

  it('skips fontSize check when fontSize is figma.mixed', () => {
    const node: AuditNodeText = {
      id: '9',
      name: 'MixedFS',
      type: 'TEXT',
      fontSize: FIGMA_MIXED,
    };
    const issues = auditTypography(node, 'Page', styleIds);
    expect(issues.find(i => i.issueType === 'hardcoded-fontSize')).toBeUndefined();
  });
});
