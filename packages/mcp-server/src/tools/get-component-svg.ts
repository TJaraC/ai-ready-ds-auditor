import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DesignSystemCache } from '../cache/store.js';
import {
  FigmaPermissionError,
  FigmaMonthlyLimitError,
  FigmaRateLimitError,
} from '../figma/types.js';
import { ChunkReconstructionError, SchemaVersionError } from '../figma/chunk-reader.js';

const MAX_NAMES_IN_ERROR = 20;

function errorResponse(message: string): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text' as const, text: `ERROR: ${message}` }] };
}

/**
 * TOOL-04: Register the get_component_svg MCP tool.
 *
 * Looks up a component's exported SVG by name (case-insensitive) or ID.
 * Returns the SVG markup with metadata, or a descriptive error for non-extractable assets.
 */
export function registerGetComponentSvg(
  server: McpServer,
  cache: DesignSystemCache
): void {
  server.tool(
    'get_component_svg',
    {
      fileKey: z
        .string()
        .optional()
        .describe(
          'Figma file key (from the URL: figma.com/file/<FILE_KEY>/...). ' +
            `Defaults to first configured file. Configured files: ${cache.configuredFileKeys.join(', ')}`
        ),
      componentName: z
        .string()
        .optional()
        .describe('Component name to look up (case-insensitive). At least one of componentName or componentId is required.'),
      componentId: z
        .string()
        .optional()
        .describe('Component node ID. Takes precedence over componentName when both are provided.'),
    },
    async ({ fileKey, componentName, componentId }) => {
      if (componentId === undefined && componentName === undefined) {
        return errorResponse('At least one of componentName or componentId must be provided.');
      }

      const key = fileKey ?? cache.defaultFileKey();

      try {
        const entry = await cache.ensureLoaded(key);
        const { svgs } = entry;

        if (svgs.length === 0) {
          return errorResponse(
            `No SVG data found for file "${entry.fileName}".\n\n` +
            `To fix:\n` +
            `1. Open the Figma file in Figma Desktop\n` +
            `2. Run the AI-Ready DS Auditor plugin (v2.0+)\n` +
            `3. Click "Inject / Update"\n` +
            `4. Try your request again`
          );
        }

        const found =
          componentId !== undefined
            ? svgs.find((s) => s.componentId === componentId)
            : svgs.find((s) => s.name.toLowerCase() === (componentName ?? '').toLowerCase());

        if (found === undefined) {
          const available = svgs
            .slice(0, MAX_NAMES_IN_ERROR)
            .map((s) => s.name)
            .join(', ');
          const suffix = svgs.length > MAX_NAMES_IN_ERROR ? ` … and ${svgs.length - MAX_NAMES_IN_ERROR} more` : '';
          return errorResponse(
            `Component not found in SVG store for file "${entry.fileName}".\n\n` +
            `Available components (${svgs.length} total): ${available}${suffix}`
          );
        }

        // SVG-03: component was found but export failed
        if (found.error !== undefined) {
          return errorResponse(
            `SVG not available for component "${found.name}": ${found.error}`
          );
        }

        // SVG-01 + SVG-02: success path
        const result = {
          name: found.name,
          type: 'COMPONENT',
          componentId: found.componentId,
          viewBox: found.viewBox,
          svg: found.svg,
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
