import type { DesignToken } from '@ai-ds-auditor/shared';

/**
 * FMT-01: Format design tokens as a Tailwind v3 JS config theme extension object.
 *
 * Output is a JSON string representing the object to merge into tailwind.config.js:
 *   module.exports = { theme: { extend: <output> } }
 *
 * Token types:
 *   color             → theme.extend.colors
 *   spacing           → theme.extend.spacing
 *   typography        → bucketed by sub-property (last segment of name):
 *     .../fontFamily  → theme.extend.fontFamily
 *     .../fontSize    → theme.extend.fontSize
 *     .../fontWeight  → theme.extend.fontWeight
 *     .../lineHeight  → theme.extend.lineHeight
 *     variable-based typography → theme.extend.fontFamily (fallback)
 *   other             → skipped
 *
 * Key normalization: replace `/` with `-`, lowercase.
 */
export function formatTailwind(tokens: DesignToken[]): string {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const fontFamily: Record<string, string> = {};
  const fontSize: Record<string, string> = {};
  const fontWeight: Record<string, string> = {};
  const lineHeight: Record<string, string> = {};

  for (const token of tokens) {
    if (token.type === 'color') {
      const key = token.name.replace(/\//g, '-').toLowerCase();
      colors[key] = token.value;
    } else if (token.type === 'spacing') {
      const key = token.name.replace(/\//g, '-').toLowerCase();
      spacing[key] = token.value;
    } else if (token.type === 'typography') {
      // Text style tokens use "<style-name>/<property>" naming convention.
      // Split on the last "/" to determine the property bucket.
      const lastSlash = token.name.lastIndexOf('/');
      const prop = lastSlash !== -1 ? token.name.slice(lastSlash + 1) : '';
      // Key = everything before the last slash (the style name), normalized
      const baseName = lastSlash !== -1 ? token.name.slice(0, lastSlash) : token.name;
      const key = baseName.replace(/\//g, '-').toLowerCase();

      switch (prop) {
        case 'fontFamily':
          fontFamily[key] = token.value;
          break;
        case 'fontSize':
          fontSize[key] = token.value;
          break;
        case 'fontWeight':
          fontWeight[key] = token.value;
          break;
        case 'lineHeight':
          lineHeight[key] = token.value;
          break;
        default:
          // Variable-based typography token (no sub-property suffix) → fontFamily bucket
          fontFamily[token.name.replace(/\//g, '-').toLowerCase()] = token.value;
      }
    }
    // 'other' tokens are not mapped to a Tailwind theme bucket
  }

  return JSON.stringify(
    { theme: { extend: { colors, spacing, fontFamily, fontSize, fontWeight, lineHeight } } },
    null,
    2
  );
}
