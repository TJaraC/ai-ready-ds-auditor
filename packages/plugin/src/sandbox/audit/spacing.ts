import type { AuditIssue } from '@shared/index';
import type { AuditNodeLayout } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits an auto-layout node (FrameNode | ComponentNode | InstanceNode) for
 * hardcoded spacing values (padding and item gap).
 *
 * Rules:
 * - Only runs on nodes where layoutMode !== 'NONE' (auto-layout enabled)
 * - Skips any field that is bound to a variable (boundVariables[field] present)
 * - Skips zero values — zero padding/gap is intentional, not a missing token
 */
export function auditSpacing(
  node: AuditNodeLayout,
  pageName: string,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Only auto-layout nodes have meaningful spacing tokens
  if (node.layoutMode === 'NONE') return issues;

  const bv = node.boundVariables;

  const spacingFields = [
    'paddingLeft',
    'paddingRight',
    'paddingTop',
    'paddingBottom',
    'itemSpacing',
  ] as const;

  for (const field of spacingFields) {
    // Skip if field is already bound to a variable
    if (bv?.[field]) continue;

    const value = node[field];

    // Zero is intentional — skip it (RESEARCH Pitfall 8: avoid noise)
    if (value === 0) continue;

    issues.push(
      buildIssue(
        node,
        pageName,
        'spacing',
        `hardcoded-${field}`,
        String(value),
        `Bind ${field} to a spacing variable`,
      ),
    );
  }

  return issues;
}
