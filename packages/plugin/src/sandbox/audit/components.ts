import type { AuditIssue } from '@shared/index';
import type { AuditNode } from './inputs';
import { buildIssue } from './utils';

/**
 * Classifies a Figma component's publish status based on its `remote` property,
 * which is available on COMPONENT nodes at runtime.
 *
 * Rules:
 * - `remote === true`  -> 'private'   (component from an external/private library)
 * - `remote === false` -> 'published' (component defined in this design system file)
 *
 * Note: The Figma Plugin API does not expose a `master` property on COMPONENT nodes.
 * Components in the current file are always classified as 'published'.
 */
export function classifyPublishStatus(
  remote: boolean,
): 'published' | 'private' {
  if (remote) return 'private';
  return 'published';
}

/**
 * Audits a scene node to detect disconnected components — FRAME or GROUP nodes
 * whose name matches a known component name but are not INSTANCE nodes.
 *
 * Rules:
 * - Only checks FRAME and GROUP node types
 * - INSTANCE nodes (type === 'INSTANCE') are already connected — never flagged
 * - COMPONENT nodes (type === 'COMPONENT') are the source of truth — never flagged
 * - Uses an exact name match against the provided componentNames set
 */
export function auditComponents(
  node: AuditNode,
  pageName: string,
  componentNames: Set<string>,
): AuditIssue[] {
  // Only FRAME and GROUP can be "disconnected" — INSTANCE/COMPONENT are always correct
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return [];

  // Name must match a known component in the design system
  if (!componentNames.has(node.name)) return [];

  return [
    buildIssue(
      node,
      pageName,
      'component',
      'disconnected-component',
      node.name,
      `Replace this ${node.type} with an instance of the "${node.name}" component`,
    ),
  ];
}
