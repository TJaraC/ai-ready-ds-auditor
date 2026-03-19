import { describe, it, expect } from 'vitest';

// Mock figma global — required for Node test environment consistency
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { auditEffects } from './effects';
import type { AuditNodeEffects } from './inputs';

describe('auditEffects', () => {
  const styleIds = new Set(['style-1', 'style-2']);

  it('returns [] when node has no effects property', () => {
    const node: AuditNodeEffects = { id: '1', name: 'Rect', type: 'RECTANGLE' };
    expect(auditEffects(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when effects array is empty', () => {
    const node: AuditNodeEffects = { id: '2', name: 'Rect', type: 'RECTANGLE', effects: [] };
    expect(auditEffects(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when effectStyleId matches a known style (all effects are intentional)', () => {
    const node: AuditNodeEffects = {
      id: '3',
      name: 'Card',
      type: 'FRAME',
      effects: [{ type: 'DROP_SHADOW' }],
      effectStyleId: 'style-1',
    };
    expect(auditEffects(node, 'Page', styleIds)).toEqual([]);
  });

  it('flags drop-shadow without effect style', () => {
    const node: AuditNodeEffects = {
      id: '4',
      name: 'Card',
      type: 'FRAME',
      effects: [{ type: 'DROP_SHADOW' }],
    };
    const issues = auditEffects(node, 'Page 1', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('effects');
    expect(issues[0]!.issueType).toBe('hardcoded-shadow');
    expect(issues[0]!.offendingValue).toBe('drop-shadow');
    expect(issues[0]!.nodeId).toBe('4');
    expect(issues[0]!.pageName).toBe('Page 1');
  });

  it('flags inner-shadow without effect style', () => {
    const node: AuditNodeEffects = {
      id: '5',
      name: 'Inset',
      type: 'FRAME',
      effects: [{ type: 'INNER_SHADOW' }],
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe('hardcoded-shadow');
    expect(issues[0]!.offendingValue).toBe('inner-shadow');
  });

  it('combines multiple shadow types into one issue', () => {
    const node: AuditNodeEffects = {
      id: '6',
      name: 'Multi',
      type: 'FRAME',
      effects: [{ type: 'DROP_SHADOW' }, { type: 'INNER_SHADOW' }],
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.offendingValue).toBe('drop-shadow, inner-shadow');
  });

  it('flags layer-blur with radius without effect style', () => {
    const node: AuditNodeEffects = {
      id: '7',
      name: 'Modal',
      type: 'FRAME',
      effects: [{ type: 'LAYER_BLUR', radius: 10 }],
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('effects');
    expect(issues[0]!.issueType).toBe('hardcoded-blur');
    expect(issues[0]!.offendingValue).toBe('layer-blur 10px');
  });

  it('flags background-blur with radius without effect style', () => {
    const node: AuditNodeEffects = {
      id: '8',
      name: 'Frosted',
      type: 'FRAME',
      effects: [{ type: 'BACKGROUND_BLUR', radius: 20 }],
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe('hardcoded-blur');
    expect(issues[0]!.offendingValue).toBe('background-blur 20px');
  });

  it('produces separate issues for shadow and blur on the same node', () => {
    const node: AuditNodeEffects = {
      id: '9',
      name: 'Mixed',
      type: 'FRAME',
      effects: [
        { type: 'DROP_SHADOW' },
        { type: 'LAYER_BLUR', radius: 8 },
      ],
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(2);
    expect(issues[0]!.issueType).toBe('hardcoded-shadow');
    expect(issues[1]!.issueType).toBe('hardcoded-blur');
    expect(issues[1]!.offendingValue).toBe('layer-blur 8px');
  });

  it('does not flag effectStyleId that is not in the known styles set', () => {
    // effectStyleId present but unrecognized → not skipped → issues reported
    const node: AuditNodeEffects = {
      id: '10',
      name: 'Unknown',
      type: 'FRAME',
      effects: [{ type: 'DROP_SHADOW' }],
      effectStyleId: 'unknown-style-id',
    };
    const issues = auditEffects(node, 'Page', styleIds);
    expect(issues).toHaveLength(1);
  });
});
