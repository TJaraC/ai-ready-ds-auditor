import type { AuditIssue } from '@shared/index';
import type { AuditNode } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits a scene node for hardcoded shadow effects (drop shadow / inner shadow)
 * that are not covered by an effect style.
 *
 * Skips:
 * - Nodes with no effects mixin
 * - Nodes with zero effects
 * - Nodes whose effectStyleId is bound to a named effect style
 */
export function auditEffects(
  node: AuditNode,
  pageName: string,
  effectStyleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!('effects' in node)) return issues;

  const effects = (node as AuditNode & { effects: ReadonlyArray<{ type: string }> }).effects;
  if (effects.length === 0) return issues;

  // If an effect style is applied, all effects are intentional
  if ('effectStyleId' in node) {
    const id = (node as AuditNode & { effectStyleId?: string }).effectStyleId;
    if (typeof id === 'string' && id !== '' && effectStyleIds.has(id)) return issues;
  }

  // Flag if any shadow effect exists without a bound effect style
  const shadowTypes = effects
    .filter((e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')
    .map((e) => (e.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow'));

  if (shadowTypes.length > 0) {
    issues.push(
      buildIssue(
        node,
        pageName,
        'effects',
        'hardcoded-shadow',
        shadowTypes.join(', '),
        'Apply an effect style to this shadow',
      ),
    );
  }

  return issues;
}
