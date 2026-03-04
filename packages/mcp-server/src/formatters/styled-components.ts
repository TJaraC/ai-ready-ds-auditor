import type { DesignToken } from '@ai-ds-auditor/shared';

/**
 * FMT-04: Format design tokens as a Styled Components / Emotion theme object.
 *
 * Output is a TypeScript string (presented to LLM as code, not executed):
 *   export const theme = {
 *     colors: { primary: "#fff" },
 *     spacing: { "4": "1rem" },
 *     typography: { body: "Inter" }
 *   } as const;
 *   export type Theme = typeof theme;
 *
 * Key normalization: last segment after final `/`, or full name if no `/`.
 * Object literal built with JSON.stringify to avoid injection issues.
 */
export function formatStyledComponents(tokens: DesignToken[]): string {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const typography: Record<string, string> = {};

  for (const token of tokens) {
    const segments = token.name.split('/');
    const key = (segments[segments.length - 1] ?? token.name).trim();

    if (token.type === 'color') {
      colors[key] = token.value;
    } else if (token.type === 'spacing') {
      spacing[key] = token.value;
    } else if (token.type === 'typography') {
      typography[key] = token.value;
    }
    // 'other' tokens skipped
  }

  const themeObj = { colors, spacing, typography };
  const json = JSON.stringify(themeObj, null, 2);

  // Insert `as const` assertion and add Theme type export
  return `export const theme = ${json} as const;\nexport type Theme = typeof theme;\n`;
}
