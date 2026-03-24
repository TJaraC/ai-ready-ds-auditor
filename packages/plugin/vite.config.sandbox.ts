import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    target: 'es6',
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/sandbox/code.ts'),
      name: 'code',
      fileName: () => 'code.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
