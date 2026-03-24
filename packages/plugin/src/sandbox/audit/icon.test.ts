import { describe, it, expect } from 'vitest';

// Mock figma global — auditors reference figma.mixed at runtime
const FIGMA_MIXED = Symbol('figma.mixed');
(globalThis as Record<string, unknown>).figma = { mixed: FIGMA_MIXED };

import { isIconByName, isIconByFont, isDisconnectedVectorIcon, auditIconSize, auditIconFills } from './icon';
import type { AuditNodeIcon } from './inputs';

// ---------------------------------------------------------------------------
// ICON-01: isIconByName
// ---------------------------------------------------------------------------
describe('isIconByName', () => {
  it('detects "icon/arrow" (path prefix)', () => {
    expect(isIconByName('icon/arrow')).toBe(true);
  });

  it('detects "Icon/Search" (case insensitive prefix)', () => {
    expect(isIconByName('Icon/Search')).toBe(true);
  });

  it('detects "ic_home" (ic_ prefix)', () => {
    expect(isIconByName('ic_home')).toBe(true);
  });

  it('detects "ic-search" (ic- prefix)', () => {
    expect(isIconByName('ic-search')).toBe(true);
  });

  it('detects "icons/nav/back" (icons/ prefix)', () => {
    expect(isIconByName('icons/nav/back')).toBe(true);
  });

  it('rejects "Button" (not an icon)', () => {
    expect(isIconByName('Button')).toBe(false);
  });

  it('rejects "iconography-section" (icon in compound word, not path prefix)', () => {
    expect(isIconByName('iconography-section')).toBe(false);
  });

  it('rejects "my-icon-button" (icon in middle, not prefix)', () => {
    expect(isIconByName('my-icon-button')).toBe(false);
  });

  it('rejects "" (empty string)', () => {
    expect(isIconByName('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ICON-02: isIconByFont
// ---------------------------------------------------------------------------
describe('isIconByFont', () => {
  it('detects Material Icons', () => {
    expect(isIconByFont({ family: 'Material Icons', style: 'Regular' })).toBe(true);
  });

  it('detects Material Symbols', () => {
    expect(isIconByFont({ family: 'Material Symbols', style: 'Outlined' })).toBe(true);
  });

  it('detects Font Awesome (case insensitive)', () => {
    expect(isIconByFont({ family: 'Font Awesome', style: 'Solid' })).toBe(true);
  });

  it('detects fontawesome (lowercase)', () => {
    expect(isIconByFont({ family: 'fontawesome', style: 'Regular' })).toBe(true);
  });

  it('detects Ionicons', () => {
    expect(isIconByFont({ family: 'Ionicons', style: 'Regular' })).toBe(true);
  });

  it('detects Feather', () => {
    expect(isIconByFont({ family: 'Feather', style: 'Regular' })).toBe(true);
  });

  it('detects Phosphor', () => {
    expect(isIconByFont({ family: 'Phosphor', style: 'Regular' })).toBe(true);
  });

  it('rejects Roboto (not icon font)', () => {
    expect(isIconByFont({ family: 'Roboto', style: 'Regular' })).toBe(false);
  });

  it('returns false for figma.mixed (Symbol)', () => {
    expect(isIconByFont(FIGMA_MIXED)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isIconByFont(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ICON-03: isDisconnectedVectorIcon
// ---------------------------------------------------------------------------
describe('isDisconnectedVectorIcon', () => {
  it('detects FRAME 24x24 with only VECTOR children', () => {
    const node: AuditNodeIcon = {
      id: '1', name: 'icon', type: 'FRAME', width: 24, height: 24,
      children: [{ type: 'VECTOR' }, { type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(true);
  });

  it('detects GROUP 32x32 with BOOLEAN_OPERATION child', () => {
    const node: AuditNodeIcon = {
      id: '2', name: 'icon', type: 'GROUP', width: 32, height: 32,
      children: [{ type: 'BOOLEAN_OPERATION' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(true);
  });

  it('rejects FRAME with TEXT child', () => {
    const node: AuditNodeIcon = {
      id: '3', name: 'icon', type: 'FRAME', width: 24, height: 24,
      children: [{ type: 'VECTOR' }, { type: 'TEXT' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects FRAME with empty children', () => {
    const node: AuditNodeIcon = {
      id: '4', name: 'icon', type: 'FRAME', width: 24, height: 24,
      children: [],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects FRAME 100x100 (too large)', () => {
    const node: AuditNodeIcon = {
      id: '5', name: 'icon', type: 'FRAME', width: 100, height: 100,
      children: [{ type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects FRAME 8x8 (too small)', () => {
    const node: AuditNodeIcon = {
      id: '6', name: 'icon', type: 'FRAME', width: 8, height: 8,
      children: [{ type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects FRAME 24x48 (aspect ratio > 1.25)', () => {
    const node: AuditNodeIcon = {
      id: '7', name: 'icon', type: 'FRAME', width: 24, height: 48,
      children: [{ type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects INSTANCE 24x24 with vector children', () => {
    const node: AuditNodeIcon = {
      id: '8', name: 'icon', type: 'INSTANCE', width: 24, height: 24,
      children: [{ type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects COMPONENT 24x24 with vector children', () => {
    const node: AuditNodeIcon = {
      id: '9', name: 'icon', type: 'COMPONENT', width: 24, height: 24,
      children: [{ type: 'VECTOR' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('rejects VECTOR node (not FRAME/GROUP)', () => {
    const node: AuditNodeIcon = {
      id: '10', name: 'icon', type: 'VECTOR', width: 24, height: 24,
    };
    expect(isDisconnectedVectorIcon(node)).toBe(false);
  });

  it('detects FRAME 24x20 with ELLIPSE and LINE children (within ratio, all vector types)', () => {
    const node: AuditNodeIcon = {
      id: '11', name: 'icon', type: 'FRAME', width: 24, height: 20,
      children: [{ type: 'ELLIPSE' }, { type: 'LINE' }],
    };
    expect(isDisconnectedVectorIcon(node)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ICON-04: auditIconSize
// ---------------------------------------------------------------------------
describe('auditIconSize', () => {
  const makeNode = (width: number, height: number): AuditNodeIcon => ({
    id: 'sz-1', name: 'icon-test', type: 'FRAME', width, height,
  });

  it('returns [] for standard 24x24 icon', () => {
    expect(auditIconSize(makeNode(24, 24), 'Page')).toEqual([]);
  });

  it.each([16, 20, 32, 40, 48])('returns [] for standard %dx%d icon', (size) => {
    expect(auditIconSize(makeNode(size, size), 'Page')).toEqual([]);
  });

  it('flags 18x18 as non-standard-size', () => {
    const issues = auditIconSize(makeNode(18, 18), 'Page');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('icon');
    expect(issues[0]!.issueType).toBe('non-standard-size');
    expect(issues[0]!.offendingValue).toBe('18x18');
    expect(issues[0]!.nodeId).toBe('sz-1');
  });

  it('flags 24x30 icon (height non-standard)', () => {
    const issues = auditIconSize(makeNode(24, 30), 'Page');
    expect(issues).toHaveLength(1);
    expect(issues[0]!.issueType).toBe('non-standard-size');
    expect(issues[0]!.offendingValue).toBe('24x30');
  });

  it('flags 22x22 icon', () => {
    const issues = auditIconSize(makeNode(22, 22), 'Page');
    expect(issues).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ICON-05: auditIconFills
// ---------------------------------------------------------------------------
describe('auditIconFills', () => {
  const styleIds = new Set(['style-1']);

  it('returns [] when node has no fills', () => {
    const node: AuditNodeIcon = { id: 'f-1', name: 'Icon', type: 'FRAME', width: 24, height: 24 };
    expect(auditIconFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when fills is figma.mixed (Symbol)', () => {
    const node: AuditNodeIcon = {
      id: 'f-2', name: 'Icon', type: 'FRAME', width: 24, height: 24,
      fills: FIGMA_MIXED,
    };
    expect(auditIconFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when fillStyleId is in styleIds', () => {
    const node: AuditNodeIcon = {
      id: 'f-3', name: 'Icon', type: 'FRAME', width: 24, height: 24,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
      fillStyleId: 'style-1',
    };
    expect(auditIconFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('returns [] when SOLID fill has boundVariables.color', () => {
    const node: AuditNodeIcon = {
      id: 'f-4', name: 'Icon', type: 'FRAME', width: 24, height: 24,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'var:1' } } }],
    };
    expect(auditIconFills(node, 'Page', styleIds)).toEqual([]);
  });

  it('flags SOLID fill without boundVariables with category "icon" and issueType "hardcoded-fill"', () => {
    const node: AuditNodeIcon = {
      id: 'f-5', name: 'Icon', type: 'FRAME', width: 24, height: 24,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
    };
    const issues = auditIconFills(node, 'Page 1', styleIds);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.category).toBe('icon');
    expect(issues[0]!.issueType).toBe('hardcoded-fill');
    expect(issues[0]!.offendingValue).toBe('#ff0000');
    expect(issues[0]!.nodeId).toBe('f-5');
  });

  it('returns [] for non-SOLID fill (GRADIENT_LINEAR)', () => {
    const node: AuditNodeIcon = {
      id: 'f-6', name: 'Icon', type: 'FRAME', width: 24, height: 24,
      fills: [{ type: 'GRADIENT_LINEAR' }],
    };
    expect(auditIconFills(node, 'Page', styleIds)).toEqual([]);
  });
});
