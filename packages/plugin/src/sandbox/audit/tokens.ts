import type { DesignToken } from '@shared/index';
import { rgbToHex } from './utils';

/**
 * Determines the DesignToken type from a Figma Variable's resolved type and scopes.
 *
 * Priority:
 * - COLOR → always 'color'
 * - FLOAT with typography scopes → 'typography'
 * - FLOAT otherwise → 'spacing'
 * - STRING with font scopes → 'typography'
 * - STRING otherwise → 'other'
 * - BOOLEAN → skip (not a design token)
 */
function resolveTokenType(
  resolvedType: VariableResolvedDataType,
  scopes: VariableScope[]
): DesignToken['type'] | null {
  if (resolvedType === 'BOOLEAN') return null;
  if (resolvedType === 'COLOR') return 'color';

  const typographyFloatScopes: VariableScope[] = [
    'FONT_SIZE',
    'LINE_HEIGHT',
    'LETTER_SPACING',
    'PARAGRAPH_SPACING',
    'PARAGRAPH_INDENT',
    'FONT_WEIGHT',
  ];
  const typographyStringScopes: VariableScope[] = ['FONT_FAMILY', 'FONT_STYLE'];

  if (resolvedType === 'FLOAT') {
    return scopes.some((s) => typographyFloatScopes.includes(s)) ? 'typography' : 'spacing';
  }

  if (resolvedType === 'STRING') {
    return scopes.some((s) => typographyStringScopes.includes(s)) ? 'typography' : 'other';
  }

  return 'other';
}

/**
 * Formats a Figma VariableValue as a CSS-friendly string.
 * Returns null for VariableAlias (deferred reference — we skip aliases).
 */
function formatVariableValue(value: VariableValue, resolvedType: VariableResolvedDataType): string | null {
  // VariableAlias — skip, it's a pointer to another variable
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return null;
  }

  if (resolvedType === 'COLOR') {
    const rgba = value as RGBA;
    const hex = rgbToHex({ r: rgba.r, g: rgba.g, b: rgba.b });
    // Append alpha hex digits if not fully opaque
    if (rgba.a !== undefined && rgba.a !== 1) {
      const alphaHex = Math.round(rgba.a * 255)
        .toString(16)
        .padStart(2, '0');
      return `${hex}${alphaHex}`;
    }
    return hex;
  }

  return String(value);
}

/**
 * Extracts local Figma Text Styles as typography DesignToken[].
 *
 * Each text style becomes one token per property (fontFamily, fontSize,
 * fontWeight, lineHeight) so formatters can address them individually.
 * Token name pattern: "<style-name>/<property>" e.g. "Heading/xl/fontFamily".
 */
export function extractTextStyleTokens(textStyles: TextStyle[]): DesignToken[] {
  const tokens: DesignToken[] = [];

  for (const style of textStyles) {
    const base = style.name; // e.g. "Heading/xl" or "Body/md"
    const groupPath = base.split('/');

    tokens.push({
      id: `${style.id}:fontFamily`,
      name: `${base}/fontFamily`,
      type: 'typography',
      value: style.fontName.family,
      rawValue: style.fontName.family,
      collectionName: 'Text Styles',
      groupPath: [...groupPath, 'fontFamily'],
    });

    tokens.push({
      id: `${style.id}:fontSize`,
      name: `${base}/fontSize`,
      type: 'typography',
      value: `${style.fontSize}px`,
      rawValue: String(style.fontSize),
      collectionName: 'Text Styles',
      groupPath: [...groupPath, 'fontSize'],
    });

    tokens.push({
      id: `${style.id}:fontWeight`,
      name: `${base}/fontWeight`,
      type: 'typography',
      value: style.fontName.style,
      rawValue: style.fontName.style,
      collectionName: 'Text Styles',
      groupPath: [...groupPath, 'fontWeight'],
    });

    // lineHeight: 'AUTO' → omit; numeric → include as px
    if (style.lineHeight.unit !== 'AUTO') {
      const lhValue =
        style.lineHeight.unit === 'PERCENT'
          ? `${style.lineHeight.value}%`
          : `${style.lineHeight.value}px`;
      tokens.push({
        id: `${style.id}:lineHeight`,
        name: `${base}/lineHeight`,
        type: 'typography',
        value: lhValue,
        rawValue: String(style.lineHeight.value),
        collectionName: 'Text Styles',
        groupPath: [...groupPath, 'lineHeight'],
      });
    }
  }

  return tokens;
}

/**
 * Extracts all local Figma Variables as DesignToken[].
 *
 * Async because documentAccess: dynamic-page requires getVariableCollectionByIdAsync.
 *
 * Skips:
 * - BOOLEAN variables
 * - VariableAlias values (cross-collection references)
 * - Variables whose collection cannot be resolved
 */
export async function extractVariableTokens(variables: Variable[]): Promise<DesignToken[]> {
  const tokens: DesignToken[] = [];

  for (const variable of variables) {
    const type = resolveTokenType(variable.resolvedType, variable.scopes);
    if (type === null) continue;

    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    if (!collection) continue;

    const rawValue = variable.valuesByMode[collection.defaultModeId];
    if (rawValue === undefined) continue;

    const value = formatVariableValue(rawValue, variable.resolvedType);
    if (value === null) continue; // VariableAlias — skip

    tokens.push({
      id: variable.id,
      name: variable.name,
      type,
      value,
      rawValue: JSON.stringify(rawValue),
      variableName: variable.name,
      collectionName: collection.name,
      groupPath: variable.name.split('/'),
    });
  }

  return tokens;
}
