import { describe, it, expect } from 'vitest';
import { serializeReport } from './serialize';
import type { AuditReport } from '@shared/types';

// Minimal valid AuditReport for testing
function makeReport(overrides?: Partial<AuditReport>): AuditReport {
  return {
    schemaVersion: '1.0.0',
    fileId: 'test-file',
    fileName: 'Test File',
    scannedAt: new Date().toISOString(),
    summary: {
      totalIssues: 0,
      totalTokens: 0,
      totalComponents: 0,
      issuesByCategory: {},
      healthScore: 100,
    },
    issues: [],
    components: [],
    tokens: [],
    ...overrides,
  };
}

describe('serializeReport', () => {
  it('returns a single chunk for a small report (well under 81,000 chars)', () => {
    const report = makeReport();
    const result = serializeReport(report);
    expect(result.chunkCount).toBe(1);
    expect(result.chunks).toHaveLength(1);
  });

  it('chunkCount matches chunks.length', () => {
    const report = makeReport();
    const result = serializeReport(report);
    expect(result.chunkCount).toBe(result.chunks.length);
  });

  it('concatenating all chunks reconstructs the original JSON', () => {
    const report = makeReport({ fileId: 'reconstruct-test', fileName: 'Reconstruct' });
    const result = serializeReport(report);
    expect(result.chunks.join('')).toBe(JSON.stringify(report));
  });

  it('totalBytes is at least the character length of the JSON string', () => {
    const report = makeReport();
    const result = serializeReport(report);
    const json = JSON.stringify(report);
    // TextEncoder UTF-8 bytes >= char count (ASCII chars are 1 byte each, multi-byte for non-ASCII)
    expect(result.totalBytes).toBeGreaterThanOrEqual(json.length);
  });

  it('produces multiple chunks for a large report (>81,000 chars)', () => {
    // Build enough issues to force the JSON past 81,000 chars
    // Each issue is ~150 chars; need ~550 issues for ~82,500 chars payload
    const issues = Array.from({ length: 600 }, (_, i) => ({
      id: `${i}:0:color:hardcoded-fill`,
      nodeId: `${i}:0`,
      nodeName: `Rectangle ${i}`.padEnd(30, ' '),
      pageName: 'Page 1',
      category: 'color' as const,
      issueType: 'hardcoded-fill',
      offendingValue: `#${i.toString(16).padStart(6, '0')}`,
      suggestedFix: 'Bind to a color variable or apply a paint style',
    }));
    const report = makeReport({ issues, summary: { totalIssues: issues.length, totalTokens: 0, totalComponents: 0, issuesByCategory: { color: issues.length }, healthScore: 0 } });
    const json = JSON.stringify(report);
    expect(json.length).toBeGreaterThan(81_000);

    const result = serializeReport(report);
    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.chunks.length).toBe(result.chunkCount);
  });

  it('exactly 81,000-char JSON produces 1 chunk; 81,001-char JSON produces 2 chunks', () => {
    // We control exact length by padding the fileId field
    // The JSON structure with empty arrays is: {"schemaVersion":"1.0.0","fileId":"PADDING","fileName":"Test File",...}
    // First serialize a baseline report and measure overhead
    const baseReport = makeReport({ fileId: '' });
    const baseJson = JSON.stringify(baseReport);
    const overhead = baseJson.length; // length without any fileId content

    const MAX_CHARS = 81_000; // Math.floor(90_000 * 0.9)

    // Build a report where JSON is exactly MAX_CHARS characters
    const paddingNeeded = MAX_CHARS - overhead;
    const exactReport = makeReport({ fileId: 'x'.repeat(paddingNeeded) });
    const exactJson = JSON.stringify(exactReport);
    expect(exactJson.length).toBe(MAX_CHARS);
    const exactResult = serializeReport(exactReport);
    expect(exactResult.chunkCount).toBe(1);

    // Build a report where JSON is MAX_CHARS + 1 characters (triggers second chunk)
    const oneOverReport = makeReport({ fileId: 'x'.repeat(paddingNeeded + 1) });
    const oneOverJson = JSON.stringify(oneOverReport);
    expect(oneOverJson.length).toBe(MAX_CHARS + 1);
    const oneOverResult = serializeReport(oneOverReport);
    expect(oneOverResult.chunkCount).toBe(2);
  });

  it('chunks have correct sizes (last chunk may be smaller)', () => {
    const MAX_CHARS = 81_000;
    // Build a report large enough for 2+ chunks to verify chunk sizes
    const issues = Array.from({ length: 600 }, (_, i) => ({
      id: `${i}:0:color:hardcoded-fill`,
      nodeId: `${i}:0`,
      nodeName: `Rectangle ${i}`.padEnd(30, ' '),
      pageName: 'Page 1',
      category: 'color' as const,
      issueType: 'hardcoded-fill',
      offendingValue: `#${i.toString(16).padStart(6, '0')}`,
      suggestedFix: 'Bind to a color variable or apply a paint style',
    }));
    const report = makeReport({ issues });
    const result = serializeReport(report);

    // All chunks except the last must be exactly MAX_CHARS chars
    for (let i = 0; i < result.chunks.length - 1; i++) {
      expect(result.chunks[i]!.length).toBe(MAX_CHARS);
    }
    // Last chunk is the remainder (<= MAX_CHARS)
    expect(result.chunks[result.chunks.length - 1]!.length).toBeLessThanOrEqual(MAX_CHARS);
  });
});
