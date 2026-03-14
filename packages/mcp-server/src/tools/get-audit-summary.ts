import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
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
 * Emits streaming notification events (start/progress/chunk/end) via extra.sendNotification().
 * Clients that do not consume notifications still receive the full result as plain JSON (STRM-02 fallback).
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
    async ({ fileKey, category }, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
      const key = fileKey ?? cache.defaultFileKey();

      try {
        const entry = await cache.ensureLoaded(key);
        const allIssues = entry.report.issues;

        const filtered =
          category !== undefined
            ? allIssues.filter((issue) => issue.category === category)
            : allIssues;

        // Determine which categories have issues (for streaming chunks)
        const activeCategories =
          category !== undefined
            ? ([category] as Category[])
            : CATEGORY_ENUM.filter((cat) => allIssues.some((i) => i.category === cat));

        // STRM-01: Send start event
        await extra.sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info' as const,
            data: JSON.stringify({
              event: 'start',
              fileKey: key,
              totalCategories: activeCategories.length,
            }),
          },
        });

        // STRM-01 + STRM-03: Send progress + chunk per category
        for (let i = 0; i < activeCategories.length; i++) {
          const cat = activeCategories[i]!;
          const catIssues = allIssues.filter((issue) => issue.category === cat);
          if (catIssues.length === 0) continue; // STRM-01: skip empty categories

          // Progress event before each chunk
          await extra.sendNotification({
            method: 'notifications/message',
            params: {
              level: 'info' as const,
              data: JSON.stringify({
                event: 'progress',
                category: cat,
                index: i + 1,
                total: activeCategories.length,
              }),
            },
          });

          // STRM-03: Each chunk is independently parseable
          await extra.sendNotification({
            method: 'notifications/message',
            params: {
              level: 'info' as const,
              data: JSON.stringify({
                event: 'chunk',
                category: cat,
                issues: catIssues,
                count: catIssues.length,
              }),
            },
          });
        }

        // STRM-01: Send end event
        await extra.sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info' as const,
            data: JSON.stringify({
              event: 'end',
              totalIssues: allIssues.length,
              filteredIssues: filtered.length,
            }),
          },
        });

        // STRM-02: No-stream fallback — return full result as plain text
        // Clients that don't consume notifications receive the complete data here
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
        // Send error notification before returning error response
        try {
          await extra.sendNotification({
            method: 'notifications/message',
            params: {
              level: 'error' as const,
              data: JSON.stringify({
                event: 'error',
                message: err instanceof Error ? err.message : String(err),
              }),
            },
          });
        } catch {
          // Ignore notification failure — proceed to error response
        }

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
