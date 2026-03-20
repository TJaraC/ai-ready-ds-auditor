import { describe, it, expect } from 'vitest';
import { shouldRunAuditor } from './index';
import type { AuditCategory } from '@shared/messages';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALL_CATEGORIES: AuditCategory[] = ['color', 'typography', 'spacing', 'border', 'effects', 'component'];

describe('shouldRunAuditor', () => {
  describe('with enabledSet provided', () => {
    it('returns true when category is in the enabled set', () => {
      const enabled = new Set<AuditCategory>(['color', 'typography']);
      expect(shouldRunAuditor('color', enabled)).toBe(true);
      expect(shouldRunAuditor('typography', enabled)).toBe(true);
    });

    it('returns false when category is NOT in the enabled set', () => {
      const enabled = new Set<AuditCategory>(['color']);
      expect(shouldRunAuditor('spacing', enabled)).toBe(false);
      expect(shouldRunAuditor('typography', enabled)).toBe(false);
      expect(shouldRunAuditor('border', enabled)).toBe(false);
      expect(shouldRunAuditor('effects', enabled)).toBe(false);
      expect(shouldRunAuditor('component', enabled)).toBe(false);
    });

    it('returns false for all categories when set is empty', () => {
      const enabled = new Set<AuditCategory>();
      for (const cat of ALL_CATEGORIES) {
        expect(shouldRunAuditor(cat, enabled)).toBe(false);
      }
    });

    it('returns true for all categories when set contains all', () => {
      const enabled = new Set<AuditCategory>(ALL_CATEGORIES);
      for (const cat of ALL_CATEGORIES) {
        expect(shouldRunAuditor(cat, enabled)).toBe(true);
      }
    });
  });

  describe('backward compatibility (no enabledSet)', () => {
    it('returns true for all categories when enabledSet is undefined', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(shouldRunAuditor(cat, undefined)).toBe(true);
      }
    });
  });
});

describe('skipSvg guard (PERF-01)', () => {
  // Static analysis: verify the skipSvg guard exists in index.ts source code.
  // runAudit() cannot be called without Figma globals, so we verify the guard pattern.
  const indexSource = readFileSync(
    resolve(__dirname, 'index.ts'),
    'utf-8',
  );

  it('contains skipSvg guard wrapping exportAsync block', () => {
    expect(indexSource).toContain('if (!options?.skipSvg)');
  });

  it('contains exportAsync call inside the skipSvg-guarded block', () => {
    // The exportAsync call must appear AFTER the skipSvg guard
    const skipSvgIndex = indexSource.indexOf('if (!options?.skipSvg)');
    const exportAsyncIndex = indexSource.indexOf('exportAsync', skipSvgIndex);
    expect(skipSvgIndex).toBeGreaterThan(-1);
    expect(exportAsyncIndex).toBeGreaterThan(skipSvgIndex);
  });
});

describe('SVG_EXPORT_CONCURRENCY (PERF-02)', () => {
  const indexSource = readFileSync(
    resolve(__dirname, 'index.ts'),
    'utf-8',
  );

  it('defines SVG_EXPORT_CONCURRENCY = 5', () => {
    expect(indexSource).toMatch(/SVG_EXPORT_CONCURRENCY\s*=\s*5/);
  });
});
