import { schemaVersion } from '@shared/index';
import type { AuditIssue, AuditReport, ComponentSpec, DesignToken } from '@shared/types';

/**
 * Converts a Figma RGB object (channels in 0–1 float range) to a CSS hex color string.
 */
export function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (channel: number): string =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Builds a deterministic issue ID from node ID, category, and issue type.
 */
export function buildIssueId(
  nodeId: string,
  category: string,
  issueType: string
): string {
  return `${nodeId}:${category}:${issueType}`;
}

/**
 * Constructs a fully-typed AuditIssue from a minimal node-like object and audit metadata.
 * The node parameter only needs `id` and `name` so this function can be tested without
 * a real Figma runtime.
 */
export function buildIssue(
  node: { id: string; name: string },
  pageName: string,
  category: AuditIssue['category'],
  issueType: string,
  offendingValue: string,
  suggestedFix: string
): AuditIssue {
  return {
    id: buildIssueId(node.id, category, issueType),
    nodeId: node.id,
    nodeName: node.name,
    pageName,
    category,
    issueType,
    offendingValue,
    suggestedFix,
  };
}

/**
 * Assembles a complete AuditReport from the given issues, components, and tokens.
 * Computes all summary fields including healthScore (clamped to 0–100).
 */
export function assembleReport(
  issues: AuditIssue[],
  components: ComponentSpec[],
  tokens: DesignToken[],
  fileId: string,
  fileName: string
): AuditReport {
  const issuesByCategory: Record<string, number> = {};
  for (const issue of issues) {
    issuesByCategory[issue.category] = (issuesByCategory[issue.category] ?? 0) + 1;
  }

  const totalIssues = issues.length;

  // Health score = 100 - (issues / max(1, components * 5)) * 100, clamped 0–100.
  // Scales issue penalty relative to the size of the design system so a large file
  // with 200 issues across 100 components isn't penalised more than a small file.
  // Minimum score floor: 10 if there are any tokens (design system exists but has issues).
  const expectedIssues = Math.max(1, components.length * 5);
  const rawScore = Math.max(0, 100 - Math.round((totalIssues / expectedIssues) * 100));
  const hasTokens = tokens.length > 0;
  const healthScore = hasTokens ? Math.max(10, rawScore) : rawScore;

  return {
    schemaVersion,
    fileId,
    fileName,
    scannedAt: new Date().toISOString(),
    summary: {
      totalIssues,
      totalTokens: tokens.length,
      totalComponents: components.length,
      issuesByCategory,
      healthScore,
    },
    issues,
    components,
    tokens,
  };
}
