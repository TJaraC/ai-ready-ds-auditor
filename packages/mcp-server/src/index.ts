import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DesignSystemCache } from './cache/store.js';
import { createServer } from './server.js';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    process.stderr.write(
      `[ai-ds-auditor] ERROR: Missing required environment variable "${name}".\n` +
        `Add it to your MCP server configuration in Cursor/Trae settings.\n`
    );
    process.exit(1);
  }
  return value.trim();
}

async function main(): Promise<void> {
  const token = getRequiredEnv('FIGMA_ACCESS_TOKEN');
  const fileKeysRaw = getRequiredEnv('FIGMA_FILE_KEYS');

  const fileKeys = fileKeysRaw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (fileKeys.length === 0) {
    process.stderr.write(
      '[ai-ds-auditor] ERROR: FIGMA_FILE_KEYS is set but contains no valid keys.\n' +
        'Provide comma-separated Figma file keys, e.g.: FIGMA_FILE_KEYS=abc123,def456\n'
    );
    process.exit(1);
  }

  process.stderr.write(
    `[ai-ds-auditor] Starting MCP server — ${fileKeys.length} Figma file(s) configured\n`
  );

  const cache = new DesignSystemCache(token, fileKeys);
  const server = createServer(cache);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`[ai-ds-auditor] Fatal error: ${String(err)}\n`);
  process.exit(1);
});
