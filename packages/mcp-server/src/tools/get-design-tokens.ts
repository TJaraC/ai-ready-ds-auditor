import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DesignToken } from '@ai-ds-auditor/shared';
import type { DesignSystemCache } from '../cache/store.js';
import { formatTailwind } from '../formatters/tailwind.js';
import { formatCssVariables } from '../formatters/css-variables.js';
import { formatCssModules } from '../formatters/css-modules.js';
import { formatStyledComponents } from '../formatters/styled-components.js';
import {
  FigmaPermissionError,
  FigmaMonthlyLimitError,
  FigmaRateLimitError,
} from '../figma/types.js';
import { ChunkReconstructionError, SchemaVersionError } from '../figma/chunk-reader.js';

const FRAMEWORK_ENUM = [
  'tailwind',
  'css-variables',
  'css-modules',
  'styled-components',
] as const;

type Framework = (typeof FRAMEWORK_ENUM)[number];

function formatTokens(tokens: DesignToken[], framework: Framework): string {
  switch (framework) {
    case 'tailwind':
      return formatTailwind(tokens);
    case 'css-variables':
      return formatCssVariables(tokens);
    case 'css-modules':
      return formatCssModules(tokens);
    case 'styled-components':
      return formatStyledComponents(tokens);
  }
}

function errorResponse(message: string): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text' as const, text: `ERROR: ${message}` }] };
}

/**
 * TOOL-01: Register the get_design_tokens MCP tool.
 *
 * Returns all design tokens from a Figma file formatted for a CSS framework.
 * Defaults to the first configured file and Tailwind v3 output.
 */
export function registerGetDesignTokens(
  server: McpServer,
  cache: DesignSystemCache
): void {
  server.tool(
    'get_design_tokens',
    {
      fileKey: z
        .string()
        .optional()
        .describe(
          'Figma file key (from the URL: figma.com/file/<FILE_KEY>/...). ' +
            `Defaults to first configured file. Configured files: ${cache.configuredFileKeys.join(', ')}`
        ),
      framework: z
        .enum(FRAMEWORK_ENUM)
        .optional()
        .default('tailwind')
        .describe(
          'CSS framework output format. Options: tailwind (v3 JS config), css-variables, css-modules, styled-components'
        ),
    },
    async ({ fileKey, framework }) => {
      const key = fileKey ?? cache.defaultFileKey();
      try {
        const entry = await cache.ensureLoaded(key);
        const formatted = formatTokens(entry.report.tokens, framework ?? 'tailwind');
        return { content: [{ type: 'text' as const, text: formatted }] };
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
