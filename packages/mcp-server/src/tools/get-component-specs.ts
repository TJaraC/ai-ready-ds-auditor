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
 * TOOL-02: Register the get_component_specs MCP tool.
 *
 * Looks up a ComponentSpec by name (case-insensitive) or ID.
 * Returns the full spec as formatted JSON.
 */
export function registerGetComponentSpecs(
  server: McpServer,
  cache: DesignSystemCache
): void {
  server.tool(
    'get_component_specs',
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
        return errorResponse(
          'At least one of componentName or componentId must be provided.'
        );
      }

      const key = fileKey ?? cache.defaultFileKey();

      try {
        const entry = await cache.ensureLoaded(key);
        const { components } = entry.report;

        const found =
          componentId !== undefined
            ? components.find((c) => c.id === componentId)
            : components.find(
                (c) => c.name.toLowerCase() === (componentName ?? '').toLowerCase()
              );

        if (found === undefined) {
          const available = components
            .slice(0, MAX_NAMES_IN_ERROR)
            .map((c) => c.name)
            .join(', ');
          const suffix =
            components.length > MAX_NAMES_IN_ERROR
              ? ` … and ${components.length - MAX_NAMES_IN_ERROR} more`
              : '';
          return errorResponse(
            `Component not found in file "${entry.fileName}".\n\n` +
              `Available components (${components.length} total): ${available}${suffix}`
          );
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(found, null, 2) }],
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
