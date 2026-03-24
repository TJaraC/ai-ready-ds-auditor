import type { AuditIssue } from '@shared/index';
import type { AuditNodeIcon } from './inputs';
import { buildIssue, rgbToHex } from './utils';

// --- ICON-01: Name-based detection ---
const ICON_NAME_PATTERNS = [
  /^icon[/\-_]/i,
  /^ic[_\-]/i,
  /^icons\//i,
];

export function isIconByName(name: string): boolean {
  return ICON_NAME_PATTERNS.some(re => re.test(name));
}

// --- ICON-02: Font-based detection ---
const ICON_FONT_FAMILIES = new Set([
  'material icons',
  'material symbols',
  'font awesome',
  'fontawesome',
  'ionicons',
  'feather',
  'phosphor',
  'tabler icons',
  'remix icon',
  'bootstrap icons',
]);

export function isIconByFont(fontName: { family: string; style: string } | symbol | undefined): boolean {
  if (!fontName || typeof fontName === 'symbol') return false;
  return ICON_FONT_FAMILIES.has(fontName.family.toLowerCase());
}

// --- ICON-03: Disconnected vector detection ---
const VECTOR_CHILD_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'ELLIPSE', 'RECTANGLE', 'POLYGON', 'STAR',
]);

export function isDisconnectedVectorIcon(node: AuditNodeIcon): boolean {
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
  const { width, height } = node;
  if (width < 16 || width > 48 || height < 16 || height > 48) return false;
  const ratio = width / height;
  if (ratio < 0.8 || ratio > 1.25) return false;
  if (!node.children || node.children.length === 0) return false;
  return node.children.every(c => VECTOR_CHILD_TYPES.has(c.type));
}

// --- ICON-04: Size consistency audit ---
const STANDARD_SIZES = new Set([16, 20, 24, 32, 40, 48]);

export function auditIconSize(node: AuditNodeIcon, pageName: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!STANDARD_SIZES.has(node.width) || !STANDARD_SIZES.has(node.height)) {
    issues.push(
      buildIssue(node, pageName, 'icon', 'non-standard-size',
        `${node.width}x${node.height}`,
        'Use a standard icon size: 16, 20, 24, 32, 40, or 48px')
    );
  }
  return issues;
}

// --- ICON-05: Hardcoded fill audit (mirrors color.ts auditFills but tagged 'icon') ---
export function auditIconFills(
  node: AuditNodeIcon,
  pageName: string,
  styleIds: Set<string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (node.fills === undefined) return issues;
  const fills = node.fills;
  if (typeof fills === 'symbol') return issues; // figma.mixed
  if (node.fillStyleId !== undefined) {
    const id = node.fillStyleId;
    if (typeof id === 'string' && id !== '' && styleIds.has(id)) return issues;
  }
  for (const fill of fills) {
    if (fill.type !== 'SOLID') continue;
    if (!fill.boundVariables?.color && fill.color) {
      const hex = rgbToHex(fill.color);
      issues.push(
        buildIssue(node, pageName, 'icon', 'hardcoded-fill', hex,
          'Bind to a color variable or apply a paint style')
      );
    }
  }
  return issues;
}
