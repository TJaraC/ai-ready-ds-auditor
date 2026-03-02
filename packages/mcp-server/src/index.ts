// Phase 1 stub — MCP server implementation in Phase 4
// Importing from shared to validate workspace resolution and type checking
import { schemaVersion } from '@ai-ds-auditor/shared';

// Write to stderr via process.stderr.write — NOT console.error — because
// the mcp-server eslint.config.ts bans console.* (no-console: error).
// process.stderr.write is the correct approach for MCP stdio servers anyway.
process.stderr.write(`MCP server stub — schema version: ${schemaVersion}\n`);
