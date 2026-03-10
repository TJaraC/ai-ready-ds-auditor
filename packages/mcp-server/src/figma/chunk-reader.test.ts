import { describe, it, expect } from 'vitest';
import {
  assembleChunks,
  parseReport,
  reconstructReport,
  ChunkReconstructionError,
  SchemaVersionError,
} from './chunk-reader';
import type { AuditMeta } from '@ai-ds-auditor/shared';

const CURRENT_SCHEMA = '1.0.0';
const TEST_FILE_KEY = 'test-file-key';

function makePluginData(reportJson: string, chunkCount = 1): Record<string, string> {
  const meta: AuditMeta = {
    schemaVersion: CURRENT_SCHEMA,
    chunkCount,
    totalBytes: reportJson.length,
    fileId: 'test-file',
    fileName: 'Test',
    scannedAt: '2026-01-01T00:00:00.000Z',
    checksum: '',
  };
  const data: Record<string, string> = { ai_data_meta: JSON.stringify(meta) };
  // Single chunk for simplicity
  data['ai_data_1'] = reportJson;
  return data;
}

function makeMeta(overrides: Partial<AuditMeta> = {}): AuditMeta {
  return {
    schemaVersion: CURRENT_SCHEMA,
    chunkCount: 1,
    totalBytes: 0,
    fileId: 'test-file',
    fileName: 'Test',
    scannedAt: '2026-01-01T00:00:00.000Z',
    checksum: '',
    ...overrides,
  };
}

const minimalReportJson = JSON.stringify({
  schemaVersion: CURRENT_SCHEMA,
  fileId: 'test-file',
  fileName: 'Test',
  scannedAt: '2026-01-01T00:00:00.000Z',
  summary: { totalIssues: 0, totalTokens: 0, totalComponents: 0, issuesByCategory: {}, healthScore: 100 },
  issues: [],
  components: [],
  tokens: [],
});

describe('assembleChunks', () => {
  it('throws ChunkReconstructionError when meta key is missing', () => {
    const pluginData: Record<string, string> = {};

    expect(() => assembleChunks(pluginData, TEST_FILE_KEY)).toThrow(ChunkReconstructionError);
    expect(() => assembleChunks(pluginData, TEST_FILE_KEY)).toThrow(/No audit data found/);
  });

  it('throws ChunkReconstructionError when meta key is empty string', () => {
    const pluginData: Record<string, string> = { ai_data_meta: '' };

    expect(() => assembleChunks(pluginData, TEST_FILE_KEY)).toThrow(ChunkReconstructionError);
  });

  it('throws ChunkReconstructionError when a chunk is missing', () => {
    const meta: AuditMeta = makeMeta({ chunkCount: 2 });
    const pluginData: Record<string, string> = {
      ai_data_meta: JSON.stringify(meta),
      ai_data_1: '{"part":1}',
      // ai_data_2 intentionally missing
    };

    expect(() => assembleChunks(pluginData, TEST_FILE_KEY)).toThrow(ChunkReconstructionError);
    expect(() => assembleChunks(pluginData, TEST_FILE_KEY)).toThrow(/Missing chunk/);
  });

  it('returns concatenated string for a single chunk', () => {
    const pluginData = makePluginData(minimalReportJson, 1);
    const result = assembleChunks(pluginData, TEST_FILE_KEY);

    expect(result.json).toBe(minimalReportJson);
    expect(result.meta.chunkCount).toBe(1);
    expect(result.meta.fileName).toBe('Test');
  });

  it('returns correctly concatenated string when multiple chunks present', () => {
    const part1 = '{"part":1,';
    const part2 = '"part2":2}';
    const meta: AuditMeta = makeMeta({ chunkCount: 2 });
    const pluginData: Record<string, string> = {
      ai_data_meta: JSON.stringify(meta),
      ai_data_1: part1,
      ai_data_2: part2,
    };

    const result = assembleChunks(pluginData, TEST_FILE_KEY);
    expect(result.json).toBe(part1 + part2);
  });

  it('attaches the correct fileKey to ChunkReconstructionError', () => {
    const pluginData: Record<string, string> = {};

    try {
      assembleChunks(pluginData, 'my-specific-key');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ChunkReconstructionError);
      expect((err as ChunkReconstructionError).fileKey).toBe('my-specific-key');
    }
  });
});

describe('parseReport', () => {
  it('throws SchemaVersionError when schema versions mismatch', () => {
    const meta = makeMeta({ schemaVersion: '0.9.0' });

    expect(() => parseReport(minimalReportJson, meta, TEST_FILE_KEY)).toThrow(SchemaVersionError);
  });

  it('SchemaVersionError exposes fileVersion, serverVersion, fileKey', () => {
    const meta = makeMeta({ schemaVersion: '0.5.0' });

    try {
      parseReport(minimalReportJson, meta, TEST_FILE_KEY);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaVersionError);
      const schemaErr = err as SchemaVersionError;
      expect(schemaErr.fileVersion).toBe('0.5.0');
      expect(schemaErr.serverVersion).toBe(CURRENT_SCHEMA);
      expect(schemaErr.fileKey).toBe(TEST_FILE_KEY);
    }
  });

  it('returns report and meta for valid JSON matching current schema', () => {
    const meta = makeMeta();
    const result = parseReport(minimalReportJson, meta, TEST_FILE_KEY);

    expect(result.report.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(result.report.fileId).toBe('test-file');
    expect(result.report.issues).toHaveLength(0);
    expect(result.meta).toBe(meta);
  });

  it('parsed report has all expected top-level fields', () => {
    const meta = makeMeta();
    const { report } = parseReport(minimalReportJson, meta, TEST_FILE_KEY);

    expect(report).toHaveProperty('schemaVersion');
    expect(report).toHaveProperty('fileId');
    expect(report).toHaveProperty('fileName');
    expect(report).toHaveProperty('scannedAt');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('issues');
    expect(report).toHaveProperty('components');
    expect(report).toHaveProperty('tokens');
  });
});

describe('reconstructReport (backward-compatible wrapper)', () => {
  it('assembles and parses valid plugin data', () => {
    const pluginData = makePluginData(minimalReportJson, 1);
    const result = reconstructReport(pluginData, TEST_FILE_KEY);

    expect(result.report.fileName).toBe('Test');
    expect(result.report.issues).toHaveLength(0);
    expect(result.meta.chunkCount).toBe(1);
  });

  it('throws ChunkReconstructionError when no data present', () => {
    expect(() => reconstructReport({}, TEST_FILE_KEY)).toThrow(ChunkReconstructionError);
  });
});
