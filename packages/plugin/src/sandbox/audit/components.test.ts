import { describe, it, expect } from 'vitest';

// Mock figma global — required for Node test environment consistency
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditComponents } from './components';
import type { AuditNode } from './inputs';

describe('auditComponents', () => {
  const componentNames = new Set(['Button', 'Card', 'Modal']);

  it('returns [] for INSTANCE node — never flagged as disconnected', () => {
    const node: AuditNode = { id: '1', name: 'Button', type: 'INSTANCE' };
    expect(auditComponents(node, 'Page', componentNames)).toEqual([]);
  });

  it('returns [] for COMPONENT node — source of truth, never flagged', () => {
    const node: AuditNode = { id: '2', name: 'Button', type: 'COMPONENT' };
    expect(auditComponents(node, 'Page', componentNames)).toEqual([]);
  });

  it('returns [] for FRAME node whose name is NOT in componentNames', () => {
    const node: AuditNode = { id: '3', name: 'Header', type: 'FRAME' };
    expect(auditComponents(node, 'Page', componentNames)).toEqual([]);
  });

  it('returns [issue] with issueType "disconnected-component" for FRAME matching a component name', () => {
    const node: AuditNode = { id: '4', name: 'Button', type: 'FRAME' };
    const issues = auditComponents(node, 'Page 1', componentNames);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe('disconnected-component');
    expect(issues[0]!.category).toBe('component');
    expect(issues[0]!.offendingValue).toBe('Button');
    expect(issues[0]!.nodeId).toBe('4');
    expect(issues[0]!.pageName).toBe('Page 1');
  });

  it('returns [issue] for GROUP node whose name matches a component name', () => {
    const node: AuditNode = { id: '5', name: 'Card', type: 'GROUP' };
    const issues = auditComponents(node, 'Page', componentNames);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe('disconnected-component');
    expect(issues[0]!.offendingValue).toBe('Card');
  });

  it('returns [] for RECTANGLE node — only FRAME and GROUP are checked', () => {
    const node: AuditNode = { id: '6', name: 'Button', type: 'RECTANGLE' };
    expect(auditComponents(node, 'Page', componentNames)).toEqual([]);
  });

  it('returns [] for TEXT node — only FRAME and GROUP are checked', () => {
    const node: AuditNode = { id: '7', name: 'Modal', type: 'TEXT' };
    expect(auditComponents(node, 'Page', componentNames)).toEqual([]);
  });

  it('suggested fix mentions node type and component name', () => {
    const node: AuditNode = { id: '8', name: 'Modal', type: 'FRAME' };
    const issues = auditComponents(node, 'Page', componentNames);
    expect(issues[0]!.suggestedFix).toContain('FRAME');
    expect(issues[0]!.suggestedFix).toContain('Modal');
  });
});
