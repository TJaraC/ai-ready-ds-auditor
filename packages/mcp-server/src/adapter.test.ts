import { describe, it, expect } from 'vitest';
import { adaptAuditSummary, adaptComponentSpec, adaptDesignTokens } from './adapter';
import type { AuditReport, ComponentSpec, DesignToken } from '@ai-ds-auditor/shared';

function makeReport(issues: AuditReport['issues'] = []): AuditReport {
  return {
    schemaVersion: '1.0.0', fileId: 'f1', fileName: 'TestFile',
    scannedAt: '2026-01-01T00:00:00.000Z',
    summary: { totalIssues: issues.length, totalTokens: 0, totalComponents: 0, issuesByCategory: {}, healthScore: 100 },
    issues, components: [], tokens: [],
  };
}

const colorIssue: AuditReport['issues'][number] = {
  id: '1:color:hardcoded-fill', nodeId: '1', nodeName: 'Rect', pageName: 'Page',
  category: 'color', issueType: 'hardcoded-fill', offendingValue: '#ff0000', suggestedFix: 'Use variable',
};
const typographyIssue: AuditReport['issues'][number] = {
  ...colorIssue, id: '2:typography:hardcoded-fontSize', category: 'typography', issueType: 'hardcoded-fontSize',
};

describe('adaptAuditSummary', () => {
  it('returns all issues when no category filter is provided', () => {
    const report = makeReport([colorIssue, typographyIssue]);
    const result = adaptAuditSummary(report, 'file-key-123');

    expect(result.fileKey).toBe('file-key-123');
    expect(result.fileName).toBe('TestFile');
    expect(result.scannedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.totalIssues).toBe(2);
    expect(result.filteredIssues).toBe(2);
    expect(result.category).toBe('all');
    expect(result.issues).toHaveLength(2);
  });

  it('filters to color issues only when category = "color"', () => {
    const report = makeReport([colorIssue, typographyIssue]);
    const result = adaptAuditSummary(report, 'file-key-123', 'color');

    expect(result.totalIssues).toBe(2);
    expect(result.filteredIssues).toBe(1);
    expect(result.category).toBe('color');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].category).toBe('color');
  });

  it('returns empty issues array when category has no matches', () => {
    const report = makeReport([colorIssue]);
    const result = adaptAuditSummary(report, 'file-key-123', 'spacing');

    expect(result.totalIssues).toBe(1);
    expect(result.filteredIssues).toBe(0);
    expect(result.category).toBe('spacing');
    expect(result.issues).toHaveLength(0);
  });

  it('handles an empty report with no issues', () => {
    const report = makeReport([]);
    const result = adaptAuditSummary(report, 'my-key');

    expect(result.totalIssues).toBe(0);
    expect(result.filteredIssues).toBe(0);
    expect(result.category).toBe('all');
    expect(result.issues).toHaveLength(0);
  });
});

describe('adaptComponentSpec', () => {
  it('returns component spec unchanged (identity transform)', () => {
    const spec: ComponentSpec = {
      id: 'comp-1', name: 'Button', key: 'abc123', description: 'Primary button',
      variants: ['primary', 'secondary'], props: ['label', 'disabled'], usageCount: 5,
    };

    const result = adaptComponentSpec(spec);
    expect(result).toEqual(spec);
    expect(result.id).toBe('comp-1');
    expect(result.name).toBe('Button');
    expect(result.variants).toHaveLength(2);
  });
});

describe('adaptDesignTokens', () => {
  it('returns tokens array unchanged (identity transform)', () => {
    const tokens: DesignToken[] = [
      {
        id: 'token-1', name: 'color/primary', type: 'color',
        value: '#0070f3', rawValue: '0070f3', groupPath: ['color'],
      },
      {
        id: 'token-2', name: 'spacing/4', type: 'spacing',
        value: '16px', rawValue: '16', groupPath: ['spacing'],
      },
    ];

    const result = adaptDesignTokens(tokens);
    expect(result).toHaveLength(2);
    expect(result).toEqual(tokens);
  });

  it('handles empty tokens array', () => {
    const result = adaptDesignTokens([]);
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });
});
