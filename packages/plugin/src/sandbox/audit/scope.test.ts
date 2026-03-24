import { describe, it, expect } from 'vitest';
import { DEFAULT_SCOPE_CONFIG } from '../../ui/state';
import type { ScopeConfig } from '../../ui/state';

describe('scope config serialization', () => {
  it('round-trips through JSON', () => {
    const json = JSON.stringify(DEFAULT_SCOPE_CONFIG);
    const parsed = JSON.parse(json) as ScopeConfig;
    expect(parsed).toEqual(DEFAULT_SCOPE_CONFIG);
  });

  it('round-trips a modified config', () => {
    const modified: ScopeConfig = { ...DEFAULT_SCOPE_CONFIG, color: false, effects: false };
    const json = JSON.stringify(modified);
    const parsed = JSON.parse(json) as ScopeConfig;
    expect(parsed.color).toBe(false);
    expect(parsed.effects).toBe(false);
    expect(parsed.typography).toBe(true);
  });
});

describe('scope config migration (merge with defaults)', () => {
  it('fills missing keys with true when partial config loaded from pluginData', () => {
    // Simulate a persisted config from an older version missing "effects"
    const partial = { color: true, typography: false, spacing: true, border: true, component: true };
    const merged: ScopeConfig = { ...DEFAULT_SCOPE_CONFIG, ...partial };
    expect(merged.effects).toBe(true); // filled from DEFAULT
    expect(merged.typography).toBe(false); // preserved from persisted
  });

  it('preserves all values when full config loaded', () => {
    const full: ScopeConfig = {
      color: false, typography: false, spacing: false,
      border: false, effects: false, component: false, icon: false,
    };
    const merged: ScopeConfig = { ...DEFAULT_SCOPE_CONFIG, ...full };
    expect(merged).toEqual(full);
  });

  it('returns DEFAULT_SCOPE_CONFIG when raw string is empty/null', () => {
    const raw = '';
    const config: ScopeConfig = raw ? JSON.parse(raw) as ScopeConfig : DEFAULT_SCOPE_CONFIG;
    expect(config).toEqual(DEFAULT_SCOPE_CONFIG);
  });
});
