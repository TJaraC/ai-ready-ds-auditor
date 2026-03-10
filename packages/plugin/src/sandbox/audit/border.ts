import type { AuditIssue } from '@shared/index';
import type { AuditNode } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits a scene node for hardcoded border shape values:
 * - cornerRadius: not bound to a variable and not 0
 * - strokeWeight: not bound to a variable, not 0, and node has visible strokes
 *
 * Skips cornerRadius when figma.mixed (individual corners set separately — future improvement).
 * Skips strokeWeight when figma.mixed or when the node has no strokes defined.
 */
export function auditBorderShape(node: AuditNode, pageName: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // cornerRadius — available on frames, components, instances, rectangles, etc.
  if ('cornerRadius' in node) {
    const n = node as AuditNode & {
      cornerRadius: number | symbol;
      boundVariables?: {
        topLeftRadius?: unknown;
        topRightRadius?: unknown;
        bottomLeftRadius?: unknown;
        bottomRightRadius?: unknown;
        strokeWeight?: unknown;
      };
      strokes: ReadonlyArray<unknown>;
      strokeWeight: number | symbol;
    };
    const cr = n.cornerRadius;
    // Figma binds individual corners (topLeftRadius etc.) — check any corner binding as proxy.
    // Skip figma.mixed (individual per-corner radii — future improvement)
    const bv = n.boundVariables;
    const hasCornerBinding =
      bv?.topLeftRadius !== undefined ||
      bv?.topRightRadius !== undefined ||
      bv?.bottomLeftRadius !== undefined ||
      bv?.bottomRightRadius !== undefined;
    if (cr !== figma.mixed && cr !== 0 && !hasCornerBinding) {
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

  // strokeWeight — only flag when the node actually has strokes
  if ('strokeWeight' in node && 'strokes' in node) {
    const n = node as AuditNode & {
      cornerRadius: number | symbol;
      boundVariables?: {
        topLeftRadius?: unknown;
        topRightRadius?: unknown;
        bottomLeftRadius?: unknown;
        bottomRightRadius?: unknown;
        strokeWeight?: unknown;
      };
      strokes: ReadonlyArray<unknown>;
      strokeWeight: number | symbol;
    };
    if (n.strokes.length > 0) {
      const sw = n.strokeWeight;
      // Skip figma.mixed (mixed stroke weights on text segments)
      if (sw !== figma.mixed && sw !== 0 && !n.boundVariables?.strokeWeight) {
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
