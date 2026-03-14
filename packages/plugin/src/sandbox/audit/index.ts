import type { AuditIssue, AuditReport, ComponentSpec, SandboxMessage } from '@shared/index';
import type { AuditNode, AuditNodeFills, AuditNodeText, AuditNodeLayout, AuditNodeBorder, AuditNodeEffects } from './inputs';
import { assembleReport } from './utils';
import { auditFills, auditStrokes } from './color';
import { auditTypography } from './typography';
import { auditSpacing } from './spacing';
import { auditComponents, classifyPublishStatus } from './components';
import { auditBorderShape } from './border';
import { auditEffects } from './effects';
import { extractVariableTokens, extractTextStyleTokens } from './tokens';

/**
 * runAudit() — Main orchestrator for the design system audit.
 *
 * Scope: only nodes that are descendants of COMPONENT definitions.
 * This targets the design system's component quality rather than arbitrary canvas frames.
 *
 * Two-pass algorithm:
 *   Pass 0: Pre-load all styles and variables.
 *   Pass 1: Collect all component names across pages (for disconnected-component detection).
 *   Pass 2: For each page, find all COMPONENT nodes, audit every descendant.
 */
export async function runAudit(): Promise<AuditReport> {
  // PASS 0 — Performance: skip invisible instance children during traversal
  figma.skipInvisibleInstanceChildren = true;

  // PASS 0 — Pre-load styles and variables (async variants required for dynamic-page manifests)
  const [paintStyles, textStyles, effectStyles, variables] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);

  const styleIds = new Set([
    ...paintStyles.map((s) => s.id),
    ...textStyles.map((s) => s.id),
  ]);
  const effectStyleIds = new Set(effectStyles.map((s) => s.id));

  const variableTokens = await extractVariableTokens(variables);
  const textStyleTokens = extractTextStyleTokens(textStyles);
  const tokens = [...variableTokens, ...textStyleTokens];

  // PASS 1 — Collect all component names across all pages (disconnected-component detection)
  const pages = figma.root.children;
  const componentNames = new Set<string>();
  for (const page of pages) {
    await page.loadAsync();
    page
      .findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })
      .forEach((n) => componentNames.add(n.name));
  }

  // PASS 2 — Audit each page, scoped to COMPONENT descendants
  const allIssues: AuditIssue[] = [];
  const allComponents: ComponentSpec[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const pageName = page.name;

    // Collect ComponentSpec for this page
    const pageComponents = page.findAllWithCriteria({ types: ['COMPONENT'] });
    pageComponents.forEach((comp) => {
      const remote = (comp as unknown as { remote: boolean }).remote ?? false;
      const master = (comp as unknown as { master: unknown }).master;
      const publishStatus = classifyPublishStatus(remote, master);
      allComponents.push({
        id: comp.id,
        name: comp.name,
        key: comp.key,
        description: comp.description,
        variants: [],
        props: [],
        usageCount: 0,
        publishStatus,
      });
    });

    // Audit only nodes inside COMPONENT definitions (the component itself + all descendants)
    for (const comp of pageComponents) {
      const nodes: SceneNode[] = [comp, ...comp.findAll()];

      for (const node of nodes) {
        // Color: fills and strokes (guards for property existence are inside each auditor)
        allIssues.push(...auditFills(node as unknown as AuditNodeFills, pageName, styleIds));
        allIssues.push(...auditStrokes(node as unknown as AuditNodeFills, pageName, styleIds));

        // Typography: text-specific properties
        if (node.type === 'TEXT') {
          allIssues.push(...auditTypography(node as unknown as AuditNodeText, pageName, styleIds));
        }

        // Spacing: auto-layout padding and gap (FRAME, COMPONENT, INSTANCE only)
        if (
          node.type === 'FRAME' ||
          node.type === 'COMPONENT' ||
          node.type === 'INSTANCE'
        ) {
          allIssues.push(...auditSpacing(node as unknown as AuditNodeLayout, pageName));
        }

        // Border: cornerRadius (uniform and per-corner) and strokeWeight
        allIssues.push(...auditBorderShape(node as unknown as AuditNodeBorder, pageName));

        // Effects: hardcoded shadows and blurs without effect style
        allIssues.push(...auditEffects(node as unknown as AuditNodeEffects, pageName, effectStyleIds));

        // Component: disconnected frames/groups that should be component instances
        allIssues.push(...auditComponents(node as unknown as AuditNode, pageName, componentNames));
      }
    }

    // Report progress after each page
    const percent = Math.round(((i + 1) / pages.length) * 100);
    const progressMsg: SandboxMessage = {
      type: 'SCAN_PROGRESS',
      percent,
      currentNode: pageName,
    };
    figma.ui.postMessage(progressMsg);
  }

  const unpublishedCount = allComponents.filter(
    (c) => c.publishStatus === 'private' || c.publishStatus === 'local',
  ).length;

  return assembleReport(allIssues, allComponents, tokens, unpublishedCount, figma.root.name, figma.root.name);
}
