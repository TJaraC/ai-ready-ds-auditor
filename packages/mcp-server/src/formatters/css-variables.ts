import type { DesignToken } from '@ai-ds-auditor/shared';

/**
 * FMT-02: Format design tokens as CSS Custom Properties (CSS Variables).
 *
 * Output wraps all tokens in a `:root { }` block:
 *   :root {
 *     --color-primary: #fff;
 *     --spacing-4: 1rem;
 *   }
 *
 * Variable name normalization: `--` prefix + token.name with `/` → `-`,
 * spaces → `-`, lowercase.
 */
export function formatCssVariables(tokens: DesignToken[]): string {
  const lines = tokens.map((token) => {
    const name = `--${token.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
    return `  ${name}: ${token.value};`;
  });

  if (lines.length === 0) {
    return ':root {}';
  }

  return `:root {\n${lines.join('\n')}\n}`;
}
