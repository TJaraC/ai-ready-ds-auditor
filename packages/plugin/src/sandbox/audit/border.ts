import type { AuditIssue } from '@shared/index';
import type { AuditNodeBorder } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits a scene node for hardcoded border shape values:
 * - cornerRadius: not bound to a variable and not 0
 *   - When figma.mixed (individual corners differ), each non-zero corner is audited independently
 * - strokeWeight: not bound to a variable, not 0, and node has visible strokes
 *
 * Skips strokeWeight when figma.mixed or when the node has no strokes defined.
 */
export function auditBorderShape(node: AuditNodeBorder, pageName: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // cornerRadius — available on frames, components, instances, rectangles, etc.
  if ('cornerRadius' in node && node.cornerRadius !== undefined) {
    const cr = node.cornerRadius;
    const bv = node.boundVariables;

    if (cr === figma.mixed) {
      // Individual per-corner audit — check each corner independently
      const corners = [
        { key: 'topLeftRadius' as const, val: node.topLeftRadius, bound: bv?.topLeftRadius },
        { key: 'topRightRadius' as const, val: node.topRightRadius, bound: bv?.topRightRadius },
        { key: 'bottomLeftRadius' as const, val: node.bottomLeftRadius, bound: bv?.bottomLeftRadius },
        { key: 'bottomRightRadius' as const, val: node.bottomRightRadius, bound: bv?.bottomRightRadius },
      ];
      for (const corner of corners) {
        if (corner.val !== undefined && corner.val !== 0 && corner.bound === undefined) {
          issues.push(
            buildIssue(
              node,
              pageName,
              'border',
              'hardcoded-cornerRadius',
              `${corner.val}px (${corner.key})`,
              'Bind cornerRadius to a border-radius variable',
            ),
          );
        }
      }
    } else {
      // Uniform corner radius — check any corner binding as proxy
      const hasCornerBinding =
        bv?.topLeftRadius !== undefined ||
        bv?.topRightRadius !== undefined ||
        bv?.bottomLeftRadius !== undefined ||
        bv?.bottomRightRadius !== undefined;
      if (cr !== 0 && !hasCornerBinding) {
        issues.push(
          buildIssue(
            node,
            pageName,
            'border',
            'hardcoded-cornerRadius',
            `${String(cr)}px`,
            'Bind cornerRadius to a border-radius variable',
          ),
        );
      }
    }
  }

  // strokeWeight — only flag when the node actually has strokes
  if ('strokeWeight' in node && node.strokeWeight !== undefined && 'strokes' in node && node.strokes) {
    if (node.strokes.length > 0) {
      const sw = node.strokeWeight;
      // Skip figma.mixed (mixed stroke weights on text segments)
      if (sw !== figma.mixed && sw !== 0 && !node.boundVariables?.strokeWeight) {
        issues.push(
          buildIssue(
            node,
            pageName,
            'border',
            'hardcoded-strokeWeight',
            `${String(sw)}px`,
            'Bind strokeWeight to a border-width variable',
          ),
        );
      }
    }
  }

  return issues;
}
