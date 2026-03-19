/**
 * adapter.ts — Pure MCP transform functions.
 *
 * Converts shared AuditReport/ComponentSpec/DesignToken types into the
 * response shapes that MCP tools return. Importing zero MCP SDK types
 * ensures MCP tool changes do not propagate into the plugin or shared types.
 *
 * At v1.0 these are largely identity transforms. v2.0 will add computed
 * properties and formatting in Phase 11.
 */
import type { AuditReport, ComponentSpec, DesignToken, AuditIssue } from '@ai-ds-auditor/shared';

const CATEGORY_VALUES = ['color', 'typography', 'spacing', 'border', 'effects', 'component'] as const;
type AuditCategory = (typeof CATEGORY_VALUES)[number];

export interface AuditSummaryResult {
  fileKey: string;
  fileName: string;
  scannedAt: string;
  totalIssues: number;
  filteredIssues: number;
  category: AuditCategory | 'all';
  issues: AuditIssue[];
}

export function adaptAuditSummary(
  report: AuditReport,
  fileKey: string,
  category?: AuditCategory
): AuditSummaryResult {
  const allIssues = report.issues;
  const filtered = category !== undefined
    ? allIssues.filter((issue) => issue.category === category)
    : allIssues;

  return {
    fileKey,
    fileName: report.fileName,
    scannedAt: report.scannedAt,
    totalIssues: allIssues.length,
    filteredIssues: filtered.length,
    category: category ?? 'all',
    issues: filtered,
  };
}

export function adaptComponentSpec(spec: ComponentSpec): ComponentSpec {
  // Identity transform at v1.0 — v2.0 Phase 11 will add computed properties
  return spec;
}

export function adaptDesignTokens(tokens: DesignToken[]): DesignToken[] {
  // Identity transform at v1.0 — v2.0 Phase 11 will add computed formatting
  return tokens;
}
