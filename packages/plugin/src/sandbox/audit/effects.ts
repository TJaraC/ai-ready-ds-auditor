import type { AuditIssue } from '@shared/index';
import type { AuditNodeEffects } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits a scene node for hardcoded effects (shadows and blurs) not covered by an effect style.
 *
 * Detected effect types:
 * - DROP_SHADOW / INNER_SHADOW → reported as 'hardcoded-shadow'
 * - LAYER_BLUR / BACKGROUND_BLUR → reported as 'hardcoded-blur' with radius value
 *
 * Skips:
 * - Nodes with no effects mixin
 * - Nodes with zero effects
 * - Nodes whose effectStyleId is bound to a named effect style (all effects are intentional)
 */
export function auditEffects(
  node: AuditNodeEffects,
  pageName: string,
  effectStyleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!node.effects || node.effects.length === 0) return issues;

  // If an effect style is applied, all effects are intentional
  if (
    node.effectStyleId !== undefined &&
    node.effectStyleId !== '' &&
    effectStyleIds.has(node.effectStyleId)
  ) {
    return issues;
  }

  // Flag shadow effects without a bound effect style
  const shadowEffects = node.effects.filter(
    (e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW',
  );
  if (shadowEffects.length > 0) {
    const shadowLabel = shadowEffects
      .map((e) => (e.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow'))
      .join(', ');
    issues.push(
      buildIssue(
        node,
        pageName,
        'effects',
        'hardcoded-shadow',
        shadowLabel,
        'Apply an effect style to this shadow',
      ),
    );
  }

  // Flag blur effects without a bound effect style
  const blurEffects = node.effects.filter(
    (e) => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR',
  );
  for (const blur of blurEffects) {
    const label = blur.type === 'LAYER_BLUR' ? 'layer-blur' : 'background-blur';
    const radius = blur.radius !== undefined ? ` ${blur.radius}px` : '';
    issues.push(
      buildIssue(
        node,
        pageName,
        'effects',
        'hardcoded-blur',
        `${label}${radius}`,
        'Apply an effect style to this blur',
      ),
    );
  }

  return issues;
}
