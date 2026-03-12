// Design token constants — source: UI-SPEC.md (Phase 6) + CONTEXT.md locked decisions
// NO hardcoded values in components — import from here instead.

// Colors (fixed brand values — not Figma-variable-based)
export const COLOR_PRIMARY = '#F55442';
export const COLOR_PRIMARY_HOVER = '#F78C80';
export const COLOR_STATUS_SUCCESS = '#2B3C35';
export const COLOR_STATUS_ERROR = '#E03E1A';
export const COLOR_SURFACE = '#FFFFFF';

// Border radius (numeric — used in React inline style `borderRadius`)
export const RADIUS_FRAME = 20;       // Root container corner radius
export const RADIUS_COMPONENT = 8;    // Cards, buttons, accordions
export const RADIUS_TABS = 5;         // Tab component

// Spacing (numeric — used in React inline style `padding`/`gap`)
export const SPACING_CONTENT = 24;    // Body padding + component padding
export const SPACING_GAP_BODY = 24;   // Body section gap (Audit-2, Config-1)
export const SPACING_GAP_HEADER = 10; // Header/tab gap
