import type { AuditIssue } from '@shared/index';
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
  node: TextNode,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // If node is bound to a named text style, all typography is intentional
  const textStyleId = node.textStyleId;
  if (
    textStyleId !== figma.mixed &&
    textStyleId !== '' &&
    styleIds.has(textStyleId as string)
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

  return issues;
}
