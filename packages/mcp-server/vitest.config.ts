import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Map the package name to source so tests do not require a pre-built dist.
      // Matches how packages/plugin/vitest.config.ts maps '@shared' -> '../shared/src'.
      '@ai-ds-auditor/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    name: '@ai-ds-auditor/mcp-server',
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
  },
});
