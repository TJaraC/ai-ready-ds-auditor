import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DesignSystemCache } from './cache/store.js';
import { registerGetDesignTokens } from './tools/get-design-tokens.js';
import { registerGetComponentSpecs } from './tools/get-component-specs.js';
import { registerGetAuditSummary } from './tools/get-audit-summary.js';
import { registerGetComponentSvg } from './tools/get-component-svg.js';

/**
 * Creates and configures the MCP server with all four tools registered.
 *
 * Deliberately thin — no business logic here. Each tool lives in its own
 * file and registers itself via the registration function pattern.
 */
export function createServer(cache: DesignSystemCache): McpServer {
  const server = new McpServer({
    name: 'AI-Ready DS Auditor',
    version: '0.1.0',
  });

  registerGetDesignTokens(server, cache);
  registerGetComponentSpecs(server, cache);
  registerGetAuditSummary(server, cache);
  registerGetComponentSvg(server, cache);

  return server;
}
