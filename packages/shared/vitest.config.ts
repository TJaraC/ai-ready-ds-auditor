import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@ai-ds-auditor/shared',
    exclude: ['dist/**', 'node_modules/**'],
  },
});
