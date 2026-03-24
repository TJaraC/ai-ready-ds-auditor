import type { AuditIssue, AuditReport, ComponentSpec, SandboxMessage, SvgRecord, ComponentLayer, LayerStateEntry, AuditCategory } from '@shared/index';
import type { AuditNode, AuditNodeFills, AuditNodeText, AuditNodeLayout, AuditNodeBorder, AuditNodeEffects, AuditNodeIcon, AuditNodeComponent } from './inputs';
import { assembleReport } from './utils';
import { auditFills, auditStrokes } from './color';
import { auditTypography } from './typography';
import { auditSpacing } from './spacing';
import { auditComponents, classifyPublishStatus } from './components';
import { auditBorderShape } from './border';
import { auditEffects } from './effects';
import { isIconByName, isIconByFont, isDisconnectedVectorIcon, auditIconSize, auditIconFills } from './icon';
import { extractVariableTokens, extractTextStyleTokens } from './tokens';
import { extractLayerTree, getVariantMap, findStatePropertyName, buildStatesMap, extractViewBox } from './extract-layers';

/** Options for runAudit(). */
export interface RunAuditOptions {
  /** When true, skip SVG export entirely (saves O(n) exportAsync calls). */
  skipSvg?: boolean;
  /** When provided, only run auditors for these categories. Omit for all (backward compat). */
  enabledCategories?: AuditCategory[];
}

/** All 7 audit categories. */
const ALL_CATEGORIES: AuditCategory[] = ['color', 'typography', 'spacing', 'border', 'effects', 'component', 'icon'];

/**
 * Determines whether a given audit category should run.
 * Extracted for unit testability -- runAudit() itself requires Figma globals.
 */
export function shouldRunAuditor(
  category: AuditCategory,
  enabledSet?: Set<AuditCategory>,
): boolean {
  if (!enabledSet) return true; // backward compat: no set = all enabled
  return enabledSet.has(category);
}

/** Maximum number of concurrent SVG exports to avoid Figma memory pressure. */
const SVG_EXPORT_CONCURRENCY = 5;

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
export async function runAudit(options?: RunAuditOptions): Promise<{ report: AuditReport; svgRecords: SvgRecord[] }> {
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
  const allSvgRecords: SvgRecord[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const pageName = page.name;

    // Collect ComponentSpec for this page
    const pageComponents = page.findAllWithCriteria({ types: ['COMPONENT'] });
    const seenComponentSets = new Map<string, ComponentSpec>();

    pageComponents.forEach((comp) => {
      const parentSet = comp.parent?.type === 'COMPONENT_SET' ? comp.parent : null;
      const componentName = parentSet ? parentSet.name : comp.name;

      // Deduplicate — first variant per COMPONENT_SET name wins
      if (seenComponentSets.has(componentName)) return;

      const remote = (comp as unknown as { remote: boolean }).remote ?? false;
      const publishStatus = classifyPublishStatus(remote);

      // Variant map from COMPONENT_SET parent
      const variants: Record<string, string[]> = parentSet
        ? getVariantMap(parentSet as unknown as { componentPropertyDefinitions?: Record<string, { type: string; variantOptions?: string[] }> })
        : {};

      // Layer tree (sync — resolvedVariables map empty; async variable resolution deferred to future enhancement)
      const layers: ComponentLayer[] = [extractLayerTree(comp as unknown as AuditNodeComponent)];

      // States map
      const statePropertyName = findStatePropertyName(variants);
      const states: Record<string, LayerStateEntry> = {};
      if (statePropertyName && parentSet) {
        const siblings = (parentSet as unknown as { children: SceneNode[] }).children
          .filter((c) => c.type === 'COMPONENT') as unknown as Array<AuditNodeComponent & { variantProperties?: Record<string, string> | null }>;
        Object.assign(states, buildStatesMap(statePropertyName, variants[statePropertyName]!, siblings));
      }

      const spec: ComponentSpec = {
        id: comp.id,
        name: componentName,
        key: comp.key,
        description: comp.description,
        publishStatus,
        layers,
        variants,
        states,
      };
      seenComponentSets.set(componentName, spec);
      allComponents.push(spec);
    });

    // Export SVGs for all components on this page (skipped during scan-only)
    if (!options?.skipSvg) {
      const total = pageComponents.length;
      for (let j = 0; j < total; j += SVG_EXPORT_CONCURRENCY) {
        const batch = pageComponents.slice(j, j + SVG_EXPORT_CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (comp) => {
            try {
              const svg = await (comp as unknown as { exportAsync(opts: { format: string }): Promise<string> }).exportAsync({ format: 'SVG_STRING' });
              const viewBox = extractViewBox(svg);
              return { componentId: comp.id, name: comp.name, viewBox, svg } as SvgRecord;
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              return {
                componentId: comp.id,
                name: comp.name,
                error: `SVG export failed: ${errorMsg}. Remote components cannot be exported directly — use a local instance.`,
              } as SvgRecord;
            }
          }),
        );
        allSvgRecords.push(...results);

        // Sub-page progress during SVG export
        const svgDone = Math.min(j + SVG_EXPORT_CONCURRENCY, total);
        const pageBase = (i / pages.length) * 100;
        const pageSlice = (1 / pages.length) * 100;
        const svgPercent = Math.round(pageBase + (svgDone / total) * pageSlice);
        const svgProgressMsg: SandboxMessage = {
          type: 'SCAN_PROGRESS',
          percent: Math.min(svgPercent, Math.round(((i + 1) / pages.length) * 100)),
          currentNode: `${pageName} — exporting SVGs (${svgDone}/${total})`,
        };
        figma.ui.postMessage(svgProgressMsg);
      }
    }

    // Build enabled-category set for filtering (undefined = all enabled, backward compat)
    const enabled = options?.enabledCategories
      ? new Set(options.enabledCategories)
      : undefined;

    // Audit only nodes inside COMPONENT definitions (the component itself + all descendants)
    for (const comp of pageComponents) {
      const nodes: SceneNode[] = [comp, ...comp.findAll()];

      for (const node of nodes) {
        // Color: fills and strokes (guards for property existence are inside each auditor)
        if (shouldRunAuditor('color', enabled)) {
          allIssues.push(...auditFills(node as unknown as AuditNodeFills, pageName, styleIds));
          allIssues.push(...auditStrokes(node as unknown as AuditNodeFills, pageName, styleIds));
        }

        // Typography: text-specific properties
        if (shouldRunAuditor('typography', enabled)) {
          if (node.type === 'TEXT') {
            allIssues.push(...auditTypography(node as unknown as AuditNodeText, pageName, styleIds));
          }
        }

        // Spacing: auto-layout padding and gap (FRAME, COMPONENT, INSTANCE only)
        if (shouldRunAuditor('spacing', enabled)) {
          if (
            node.type === 'FRAME' ||
            node.type === 'COMPONENT' ||
            node.type === 'INSTANCE'
          ) {
            allIssues.push(...auditSpacing(node as unknown as AuditNodeLayout, pageName));
          }
        }

        // Border: cornerRadius (uniform and per-corner) and strokeWeight
        if (shouldRunAuditor('border', enabled)) {
          allIssues.push(...auditBorderShape(node as unknown as AuditNodeBorder, pageName));
        }

        // Effects: hardcoded shadows and blurs without effect style
        if (shouldRunAuditor('effects', enabled)) {
          allIssues.push(...auditEffects(node as unknown as AuditNodeEffects, pageName, effectStyleIds));
        }

        // Component: disconnected frames/groups that should be component instances
        if (shouldRunAuditor('component', enabled)) {
          allIssues.push(...auditComponents(node as unknown as AuditNode, pageName, componentNames));
        }

        // Icon: detection + size + fills (ICON-01 through ICON-05, ICON-07)
        if (shouldRunAuditor('icon', enabled)) {
          const iconNode = node as unknown as AuditNodeIcon;
          const isIcon = isIconByName(node.name)
            || (node.type === 'TEXT' && isIconByFont(iconNode.fontName))
            || isDisconnectedVectorIcon(iconNode);
          if (isIcon) {
            allIssues.push(...auditIconSize(iconNode, pageName));
            allIssues.push(...auditIconFills(iconNode, pageName, styleIds));
          }
        }
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
    (c) => c.publishStatus === 'private',
  ).length;

  const report = assembleReport(allIssues, allComponents, tokens, unpublishedCount, figma.root.name, figma.root.name);
  return { report, svgRecords: allSvgRecords };
}
