import { describe, it, expect } from 'vitest';
import { schemaVersion, CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES } from './index';

describe('shared package exports', () => {
  it('exports the correct schemaVersion as the first export', () => {
    expect(schemaVersion).toBe('2.0.0');
  });

  it('exports chunking constants with correct values', () => {
    expect(CHUNK_KEY_PREFIX).toBe('ai_data_');
    expect(META_KEY).toBe('ai_data_meta');
    expect(MAX_CHUNK_BYTES).toBe(90_000);
  });
});
