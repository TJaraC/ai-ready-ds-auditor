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
 * Extracts all local Figma Variables as DesignToken[].
 *
 * Skips:
 * - BOOLEAN variables
 * - VariableAlias values (cross-collection references)
 * - Variables whose collection cannot be resolved
 */
export function extractVariableTokens(variables: Variable[]): DesignToken[] {
  const tokens: DesignToken[] = [];

  for (const variable of variables) {
    const type = resolveTokenType(variable.resolvedType, variable.scopes);
    if (type === null) continue;

    const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
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
