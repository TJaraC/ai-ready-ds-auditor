import type { AuditIssue } from '@shared/index';
import type { AuditNodeText } from './inputs';
import { buildIssue } from './utils';

/**
 * Audits a TextNode for hardcoded typography values.
 *
 * Skips nodes that have a named text style applied (textStyleId present and in styleIds set).
 * Guards against figma.mixed on fontSize and fontWeight before calling String().
 *
 * Reports:
 * - hardcoded-fontSize: when fontSize is not bound to a variable and no text style applied
 * - hardcoded-fontWeight: when fontWeight is not bound to a variable and no text style applied
 *   (only when fontSize is also unbound, to avoid duplicate noise on partially-bound nodes)
 */
export function auditTypography(
  node: AuditNodeText,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // If node is bound to a named text style, all typography is intentional
  const textStyleId = node.textStyleId;
  if (
    textStyleId !== figma.mixed &&
    textStyleId !== '' &&
    typeof textStyleId === 'string' &&
    styleIds.has(textStyleId)
  ) {
    return issues;
  }

  const boundVars = node.boundVariables;

  // Check fontSize — guard figma.mixed before String() conversion
  if (!boundVars?.fontSize && node.fontSize !== figma.mixed) {
    issues.push(
      buildIssue(
        node,
        pageName,
        'typography',
        'hardcoded-fontSize',
        String(node.fontSize),
        'Apply a text style or bind fontSize to a variable',
      ),
    );
  }

  // Check fontWeight — only when fontSize is also unbound (avoid noise on partial bindings)
  // Guard figma.mixed before String() conversion
  if (
    !boundVars?.fontWeight &&
    !boundVars?.fontSize &&
    node.fontWeight !== figma.mixed
  ) {
    issues.push(
      buildIssue(
        node,
        pageName,
        'typography',
        'hardcoded-fontWeight',
        String(node.fontWeight),
        'Apply a text style or bind fontName to a variable',
      ),
    );
  }

  // Check lineHeight — skip AUTO (intentional default), skip if bound to variable
  if (!boundVars?.lineHeight && node.lineHeight !== figma.mixed) {
    const lh = node.lineHeight as { unit: string; value?: number };
    if (lh.unit !== 'AUTO') {
      const value = lh.unit === 'PIXELS' ? `${lh.value}px` : `${lh.value}%`;
      issues.push(
        buildIssue(
          node,
          pageName,
          'typography',
          'hardcoded-lineHeight',
          value,
          'Apply a text style or bind lineHeight to a variable',
        ),
      );
    }
  }

  // Check letterSpacing — skip 0 (normal default), skip if bound to variable
  if (!boundVars?.letterSpacing && node.letterSpacing !== figma.mixed) {
    const ls = node.letterSpacing as { unit: string; value: number };
    if (ls.value !== 0) {
      const value = ls.unit === 'PIXELS' ? `${ls.value}px` : `${ls.value}%`;
      issues.push(
        buildIssue(
          node,
          pageName,
          'typography',
          'hardcoded-letterSpacing',
          value,
          'Apply a text style or bind letterSpacing to a variable',
        ),
      );
    }
  }

  return issues;
}
