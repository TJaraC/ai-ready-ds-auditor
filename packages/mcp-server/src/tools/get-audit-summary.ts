import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuditIssue } from '@ai-ds-auditor/shared';
import type { DesignSystemCache } from '../cache/store.js';
import {
  FigmaPermissionError,
  FigmaMonthlyLimitError,
  FigmaRateLimitError,
} from '../figma/types.js';
import { ChunkReconstructionError, SchemaVersionError } from '../figma/chunk-reader.js';

const CATEGORY_ENUM = [
  'color',
  'typography',
  'spacing',
  'border',
  'effects',
  'component',
] as const;

type Category = (typeof CATEGORY_ENUM)[number];

interface AuditSummaryResult {
  fileKey: string;
  fileName: string;
  scannedAt: string;
  totalIssues: number;
  filteredIssues: number;
  category: Category | 'all';
  issues: AuditIssue[];
}

function errorResponse(message: string): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text' as const, text: `ERROR: ${message}` }] };
}

/**
 * TOOL-03: Register the get_audit_summary MCP tool.
 *
 * Returns all audit issues from a Figma file, optionally filtered by category.
 */
export function registerGetAuditSummary(
  server: McpServer,
  cache: DesignSystemCache
): void {
  server.tool(
    'get_audit_summary',
    {
      fileKey: z
        .string()
        .optional()
        .describe(
          'Figma file key (from the URL: figma.com/file/<FILE_KEY>/...). ' +
            `Defaults to first configured file. Configured files: ${cache.configuredFileKeys.join(', ')}`
        ),
      category: z
        .enum(CATEGORY_ENUM)
        .optional()
        .describe(
          'Filter issues by category. Options: color, typography, spacing, border, effects, component. ' +
            'If omitted, all issues are returned.'
        ),
    },
    async ({ fileKey, category }) => {
      const key = fileKey ?? cache.defaultFileKey();

      try {
        const entry = await cache.ensureLoaded(key);
        const allIssues = entry.report.issues;

        const filtered =
          category !== undefined
            ? allIssues.filter((issue) => issue.category === category)
            : allIssues;

        const result: AuditSummaryResult = {
          fileKey: key,
          fileName: entry.fileName,
          scannedAt: entry.meta.scannedAt,
          totalIssues: allIssues.length,
          filteredIssues: filtered.length,
          category: category ?? 'all',
          issues: filtered,
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        if (err instanceof FigmaPermissionError) return errorResponse(err.message);
        if (err instanceof FigmaMonthlyLimitError) return errorResponse(err.message);
        if (err instanceof FigmaRateLimitError) return errorResponse(err.message);
        if (err instanceof ChunkReconstructionError) return errorResponse(err.message);
        if (err instanceof SchemaVersionError) return errorResponse(err.message);
        return errorResponse(`Unexpected error: ${String(err)}`);
      }
    }
  );
}
