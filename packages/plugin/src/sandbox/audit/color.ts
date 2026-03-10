import type { AuditIssue } from '@shared/index';
import type { AuditNodeFills } from './inputs';
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
  node: AuditNodeFills,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (node.fills === undefined) return issues;

  const fills = node.fills;

  // Mixed text fills — cannot inspect per-fill at node level
  if (fills === figma.mixed) return issues;

  // If node is bound to a named fill style, all fills are intentional
  if (node.fillStyleId !== undefined) {
    const id = node.fillStyleId;
    if (typeof id === 'string' && id !== '' && styleIds.has(id)) {
      return issues;
    }
  }

  for (const fill of fills as ReadonlyArray<{ type: string; color?: { r: number; g: number; b: number }; boundVariables?: { color?: unknown } }>) {
    // Only SOLID paints can be variable-bound via boundVariables.color
    if (fill.type !== 'SOLID') continue;

    if (!fill.boundVariables?.color && fill.color) {
      const hex = rgbToHex(fill.color);
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
  node: AuditNodeFills,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (node.strokes === undefined) return issues;

  const strokes = node.strokes;

  // If node is bound to a named stroke style, all strokes are intentional
  if (node.strokeStyleId !== undefined) {
    const id = node.strokeStyleId;
    if (typeof id === 'string' && id !== '' && styleIds.has(id)) {
      return issues;
    }
  }

  for (const stroke of strokes) {
    // Only SOLID paints can be variable-bound via boundVariables.color
    if (stroke.type !== 'SOLID') continue;

    if (!stroke.boundVariables?.color && stroke.color) {
      const hex = rgbToHex(stroke.color);
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
