import { describe, it, expect } from 'vitest';
import { rgbToHex, buildIssueId, buildIssue, assembleReport } from './utils';

describe('rgbToHex', () => {
  it('converts black { r:0, g:0, b:0 } to #000000', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
  });

  it('converts white { r:1, g:1, b:1 } to #ffffff', () => {
    expect(rgbToHex({ r: 1, g: 1, b: 1 })).toBe('#ffffff');
  });

  it('converts red { r:1, g:0, b:0 } to #ff0000', () => {
    expect(rgbToHex({ r: 1, g: 0, b: 0 })).toBe('#ff0000');
  });

  it('rounds fractional RGB values correctly (0.502, 0.251, 0.749) → #8040bf', () => {
    // 0.502*255 = 128.01 → Math.round → 128 = 0x80
    // 0.251*255 = 64.005 → Math.round → 64 = 0x40
    // 0.749*255 = 190.995 → Math.round → 191 = 0xbf
    expect(rgbToHex({ r: 0.502, g: 0.251, b: 0.749 })).toBe('#8040bf');
  });
});

describe('buildIssueId', () => {
  it('concatenates nodeId, category, and issueType with colons', () => {
    expect(buildIssueId('123:456', 'color', 'hardcoded-fill')).toBe(
      '123:456:color:hardcoded-fill'
    );
  });

  it('works for spacing category', () => {
    expect(buildIssueId('1:2', 'spacing', 'hardcoded-paddingLeft')).toBe(
      '1:2:spacing:hardcoded-paddingLeft'
    );
  });
});

describe('buildIssue', () => {
  const mockNode = { id: '10:20', name: 'Button/Primary' };

  it('returns AuditIssue with correct id from buildIssueId', () => {
    const issue = buildIssue(
      mockNode,
      'Page 1',
      'color',
      'hardcoded-fill',
      '#ff0000',
      'Use color variable --brand-primary'
    );
    expect(issue.id).toBe('10:20:color:hardcoded-fill');
  });

  it('sets nodeId and nodeName from the node argument', () => {
    const issue = buildIssue(
      mockNode,
      'Page 1',
      'color',
      'hardcoded-fill',
      '#ff0000',
      'Use color variable'
    );
    expect(issue.nodeId).toBe('10:20');
    expect(issue.nodeName).toBe('Button/Primary');
  });

  it('sets pageName, category, issueType, offendingValue, suggestedFix', () => {
    const issue = buildIssue(
      mockNode,
      'My Page',
      'typography',
      'hardcoded-fontSize',
      '16px',
      'Use text style Heading/H2'
    );
    expect(issue.pageName).toBe('My Page');
    expect(issue.category).toBe('typography');
    expect(issue.issueType).toBe('hardcoded-fontSize');
    expect(issue.offendingValue).toBe('16px');
    expect(issue.suggestedFix).toBe('Use text style Heading/H2');
  });
});

describe('assembleReport', () => {
  const mockNode = { id: '1:1', name: 'Frame' };

  const colorIssue = buildIssue(
    mockNode,
    'Page 1',
    'color',
    'hardcoded-fill',
    '#ff0000',
    'Use variable'
  );
  const typographyIssue = buildIssue(
    mockNode,
    'Page 1',
    'typography',
    'hardcoded-fontSize',
    '14px',
    'Use text style'
  );
  const colorIssue2 = buildIssue(
    { id: '2:2', name: 'Text' },
    'Page 2',
    'color',
    'hardcoded-stroke',
    '#0000ff',
    'Use variable'
  );

  it('sets schemaVersion to 1.0.0 from @shared', () => {
    const report = assembleReport([], [], [], 0, 'file123', 'My File');
    expect(report.schemaVersion).toBe('1.0.0');
  });

  it('sets fileId and fileName', () => {
    const report = assembleReport([], [], [], 0, 'abc-file-id', 'Design System');
    expect(report.fileId).toBe('abc-file-id');
    expect(report.fileName).toBe('Design System');
  });

  it('sets scannedAt as an ISO date string', () => {
    const report = assembleReport([], [], [], 0, 'f1', 'F');
    expect(report.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('totalIssues = issues.length', () => {
    const report = assembleReport([colorIssue, typographyIssue], [], [], 0, 'f1', 'F');
    expect(report.summary.totalIssues).toBe(2);
  });

  it('totalTokens = tokens.length', () => {
    const token = {
      id: 't1',
      name: 'brand-primary',
      type: 'color' as const,
      value: '#ff0000',
      rawValue: '#ff0000',
      groupPath: [],
    };
    const report = assembleReport([], [], [token], 0, 'f1', 'F');
    expect(report.summary.totalTokens).toBe(1);
  });

  it('totalComponents = components.length', () => {
    const comp = {
      id: 'c1',
      name: 'Button',
      key: 'btn-key',
      description: '',
      publishStatus: 'published' as const,
      layers: [],
      variants: {},
      states: {},
    };
    const report = assembleReport([], [comp], [], 0, 'f1', 'F');
    expect(report.summary.totalComponents).toBe(1);
  });

  it('issuesByCategory counts correctly', () => {
    const report = assembleReport(
      [colorIssue, typographyIssue, colorIssue2],
      [],
      [],
      0,
      'f1',
      'F'
    );
    expect(report.summary.issuesByCategory['color']).toBe(2);
    expect(report.summary.issuesByCategory['typography']).toBe(1);
    expect(report.summary.issuesByCategory['spacing']).toBeUndefined();
  });

  it('healthScore = 100 when 0 issues', () => {
    const report = assembleReport([], [], [], 0, 'f1', 'F');
    expect(report.summary.healthScore).toBe(100);
  });

  it('healthScore = 50 when 50 issues', () => {
    const issues = Array.from({ length: 50 }, (_, i) =>
      buildIssue({ id: `${i}:0`, name: `Node ${i}` }, 'Page', 'color', 'hardcoded-fill', '#000', 'fix')
    );
    const report = assembleReport(issues, [], [], 0, 'f1', 'F');
    expect(report.summary.healthScore).toBe(50);
  });

  it('healthScore = 0 when 150 issues (clamped at 0)', () => {
    const issues = Array.from({ length: 150 }, (_, i) =>
      buildIssue({ id: `${i}:0`, name: `Node ${i}` }, 'Page', 'spacing', 'hardcoded-gap', '8', 'fix')
    );
    const report = assembleReport(issues, [], [], 0, 'f1', 'F');
    expect(report.summary.healthScore).toBe(0);
  });

  it('report contains the issues array passed in', () => {
    const report = assembleReport([colorIssue], [], [], 0, 'f1', 'F');
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toEqual(colorIssue);
  });

  it('summary.unpublishedComponents reflects unpublishedCount parameter', () => {
    const report = assembleReport([], [], [], 5, 'f1', 'F');
    expect(report.summary.unpublishedComponents).toBe(5);
  });

  it('summary.unpublishedComponents is 0 when no unpublished components', () => {
    const report = assembleReport([], [], [], 0, 'f1', 'F');
    expect(report.summary.unpublishedComponents).toBe(0);
  });
});
