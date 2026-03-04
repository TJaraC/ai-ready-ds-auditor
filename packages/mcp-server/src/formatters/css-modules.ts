import type { DesignToken } from '@ai-ds-auditor/shared';

/**
 * FMT-03: Format design tokens as CSS Modules :export block.
 *
 * Output:
 *   :export {
 *     color_primary: #fff;
 *     spacing_4: 1rem;
 *   }
 *
 * Key normalization: token.name with `/` → `_`, spaces → `_`, `-` → `_`, lowercase.
 */
export function formatCssModules(tokens: DesignToken[]): string {
  const lines = tokens.map((token) => {
    const key = token.name
      .replace(/\//g, '_')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
    return `  ${key}: ${token.value};`;
  });

  if (lines.length === 0) {
    return ':export {}';
  }

  return `:export {\n${lines.join('\n')}\n}`;
}
