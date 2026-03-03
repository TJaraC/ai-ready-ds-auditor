import type { AuditIssue } from '@shared/index';
import { buildIssue } from './utils';

/**
 * Audits a scene node for hardcoded border shape values:
 * - cornerRadius: not bound to a variable and not 0
 * - strokeWeight: not bound to a variable, not 0, and node has visible strokes
 *
 * Skips cornerRadius when figma.mixed (individual corners set separately — future improvement).
 * Skips strokeWeight when figma.mixed or when the node has no strokes defined.
 */
export function auditBorderShape(node: SceneNode, pageName: string): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // cornerRadius — available on frames, components, instances, rectangles, etc.
  if ('cornerRadius' in node) {
    const n = node as FrameNode; // FrameNode covers the common superset of properties
    const cr = n.cornerRadius;
    // Skip figma.mixed (individual per-corner radii — future improvement)
    if (cr !== figma.mixed && cr !== 0 && !n.boundVariables?.cornerRadius) {
      issues.push(
        buildIssue(
          node,
          pageName,
          'border',
          'hardcoded-cornerRadius',
          `${cr}px`,
          'Bind cornerRadius to a border-radius variable',
        ),
      );
    }
  }

  // strokeWeight — only flag when the node actually has strokes
  if ('strokeWeight' in node && 'strokes' in node) {
    const n = node as FrameNode;
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
            `${sw}px`,
            'Bind strokeWeight to a border-width variable',
          ),
        );
      }
    }
  }

  return issues;
}
