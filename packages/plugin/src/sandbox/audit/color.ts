import type { AuditIssue } from '@shared/index';
import { buildIssue, rgbToHex } from './utils';

/**
 * Audits the fills of a scene node for hardcoded colors.
 *
 * Skips:
 * - Nodes with no fills mixin
 * - figma.mixed fills (mixed text node fills)
 * - Fills bound to a named paint style
 * - Non-SOLID paints (gradients, images, videos — cannot be variable-bound)
 * - SOLID fills that already have a boundVariables.color alias
 */
export function auditFills(
  node: SceneNode,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!('fills' in node)) return issues;

  const fills = node.fills;

  // Mixed text fills — cannot inspect per-fill at node level
  if (fills === figma.mixed) return issues;

  // If node is bound to a named fill style, all fills are intentional
  if ('fillStyleId' in node) {
    const id = node.fillStyleId;
    if (typeof id === 'string' && id !== '' && styleIds.has(id)) {
      return issues;
    }
  }

  for (const fill of fills) {
    // Only SOLID paints can be variable-bound via boundVariables.color
    if (fill.type !== 'SOLID') continue;

    const solidFill = fill as SolidPaint;
    if (!solidFill.boundVariables?.color) {
      const hex = rgbToHex(solidFill.color);
      issues.push(
        buildIssue(
          node,
          pageName,
          'color',
          'hardcoded-fill',
          hex,
          'Bind to a color variable or apply a paint style',
        ),
      );
    }
  }

  return issues;
}

/**
 * Audits the strokes of a scene node for hardcoded colors.
 *
 * Follows the same logic as auditFills but checks strokes and strokeStyleId.
 */
export function auditStrokes(
  node: SceneNode,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!('strokes' in node)) return issues;

  const strokes = node.strokes;

  // If node is bound to a named stroke style, all strokes are intentional
  if ('strokeStyleId' in node) {
    const id = node.strokeStyleId;
    if (typeof id === 'string' && id !== '' && styleIds.has(id)) {
      return issues;
    }
  }

  for (const stroke of strokes) {
    // Only SOLID paints can be variable-bound via boundVariables.color
    if (stroke.type !== 'SOLID') continue;

    const solidStroke = stroke as SolidPaint;
    if (!solidStroke.boundVariables?.color) {
      const hex = rgbToHex(solidStroke.color);
      issues.push(
        buildIssue(
          node,
          pageName,
          'color',
          'hardcoded-stroke',
          hex,
          'Bind to a color variable or apply a paint style',
        ),
      );
    }
  }

  return issues;
}
