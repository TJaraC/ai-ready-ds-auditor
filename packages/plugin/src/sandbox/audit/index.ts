import type { AuditIssue, AuditReport, ComponentSpec, SandboxMessage } from '@shared/index';
import { assembleReport } from './utils';
import { auditFills, auditStrokes } from './color';
import { auditTypography } from './typography';
import { auditSpacing } from './spacing';
import { auditComponents } from './components';

/**
 * runAudit() — Main orchestrator for the full scene-graph audit.
 *
 * Two-pass algorithm:
 *   Pass 0: Pre-load all styles/variables and set performance flags.
 *   Pass 1: Collect all component names across all pages (for disconnected-component detection).
 *   Pass 2: Audit each page, run all four auditors per node category, send SCAN_PROGRESS.
 *
 * Returns a fully typed AuditReport with all findings assembled.
 */
export async function runAudit(): Promise<AuditReport> {
  // PASS 0 — Performance flag: skip invisible instance children during traversal
  figma.skipInvisibleInstanceChildren = true;

  // PASS 0 — Pre-load styles and variables (async variants REQUIRED — sync methods throw with dynamic-page manifest)
  const [paintStyles, textStyles, variables] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  const styleIds = new Set([
    ...paintStyles.map((s) => s.id),
    ...textStyles.map((s) => s.id),
  ]);
  const varIds = new Set(variables.map((v) => v.id));
  void varIds; // varIds reserved for future use — currently unused by auditors

  // PASS 1 — Collect all component names across all pages (for disconnected-component detection)
  const pages = figma.root.children;
  const componentNames = new Set<string>();
  for (const page of pages) {
    await page.loadAsync();
    page
      .findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })
      .forEach((n) => componentNames.add(n.name));
  }

  // PASS 2 — Audit each page (pages are already loaded from pass 1)
  const allIssues: AuditIssue[] = [];
  const allComponents: ComponentSpec[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const pageName = page.name;

    // Collect minimal ComponentSpec from this page
    page.findAllWithCriteria({ types: ['COMPONENT'] }).forEach((comp) => {
      allComponents.push({
        id: comp.id,
        name: comp.name,
        key: comp.key,
        description: comp.description,
        variants: [], // variant details are Phase 3/4 concern
        props: [],
        usageCount: 0,
      });
    });

    // TEXT nodes: audit fills and typography
    const textNodes = page.findAllWithCriteria({ types: ['TEXT'] });
    for (const node of textNodes) {
      allIssues.push(...auditFills(node, pageName, styleIds));
      allIssues.push(...auditTypography(node, pageName, styleIds));
    }

    // FRAME/COMPONENT/INSTANCE nodes: audit fills, strokes, spacing, and disconnected components
    const frameNodes = page.findAllWithCriteria({ types: ['FRAME', 'COMPONENT', 'INSTANCE'] });
    for (const node of frameNodes) {
      allIssues.push(...auditFills(node, pageName, styleIds));
      allIssues.push(...auditStrokes(node, pageName, styleIds));
      allIssues.push(...auditSpacing(node, pageName));
      allIssues.push(...auditComponents(node, pageName, componentNames));
    }

    // Shape nodes (rectangles, ellipses, etc.): audit fills and strokes only
    const shapeNodes = page.findAllWithCriteria({
      types: ['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR', 'LINE'],
    });
    for (const node of shapeNodes) {
      allIssues.push(...auditFills(node, pageName, styleIds));
      allIssues.push(...auditStrokes(node, pageName, styleIds));
    }

    // GROUP nodes: audit fills, strokes, and disconnected-component detection.
    // Do NOT pass to auditSpacing — GROUP nodes have no layoutMode property.
    const groupNodes = page.findAllWithCriteria({ types: ['GROUP'] });
    for (const node of groupNodes) {
      allIssues.push(...auditFills(node, pageName, styleIds));
      allIssues.push(...auditStrokes(node, pageName, styleIds));
      allIssues.push(...auditComponents(node, pageName, componentNames));
    }

    // Send SCAN_PROGRESS after each page
    const percent = Math.round(((i + 1) / pages.length) * 100);
    const progressMsg: SandboxMessage = {
      type: 'SCAN_PROGRESS',
      percent,
      currentNode: pageName,
    };
    figma.ui.postMessage(progressMsg);
  }

  // Use figma.root.name as fileId — figma.fileKey is undefined for non-private plugins (RESEARCH Pitfall 5)
  return assembleReport(allIssues, allComponents, [], figma.root.name, figma.root.name);
}
