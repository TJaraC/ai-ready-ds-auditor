import { describe, it, expect } from 'vitest';
import { assembleSvgChunks, SvgChunkError } from './svg-chunk-reader';
import type { SvgRecord } from '@ai-ds-auditor/shared';

const TEST_FILE_KEY = 'test-file-key';

function makeSvgPluginData(records: SvgRecord[], chunkCount = 1): Record<string, string> {
  const json = JSON.stringify(records);
  const meta = { chunkCount, totalBytes: json.length, recordCount: records.length };
  const data: Record<string, string> = { ai_svg_meta: JSON.stringify(meta) };
  data['ai_svg_1'] = json;
  return data;
}

describe('assembleSvgChunks', () => {
  it('returns empty array when ai_svg_meta key is missing (SVG store is optional)', () => {
    const pluginData: Record<string, string> = {};
    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toEqual([]);
  });

  it('returns empty array when ai_svg_meta key is empty string', () => {
    const pluginData: Record<string, string> = { ai_svg_meta: '' };
    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toEqual([]);
  });

  it('reconstructs SvgRecord[] from a single chunk', () => {
    const records: SvgRecord[] = [
      { componentId: '1', name: 'Button', svg: '<svg/>' },
    ];
    const pluginData = makeSvgPluginData(records, 1);

    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toHaveLength(1);
    expect(result[0]!.componentId).toBe('1');
    expect(result[0]!.name).toBe('Button');
    expect(result[0]!.svg).toBe('<svg/>');
  });

  it('reconstructs SvgRecord[] from multiple chunks', () => {
    const part1 = '[{"componentId":"1","name":"Button","svg":"<svg/>"},';
    const part2 = '{"componentId":"2","name":"Card","svg":"<svg/>"}]';
    const meta = { chunkCount: 2, totalBytes: part1.length + part2.length, recordCount: 2 };
    const pluginData: Record<string, string> = {
      ai_svg_meta: JSON.stringify(meta),
      ai_svg_1: part1,
      ai_svg_2: part2,
    };

    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Button');
    expect(result[1]!.name).toBe('Card');
  });

  it('reconstructs SvgRecord with viewBox field', () => {
    const records: SvgRecord[] = [
      { componentId: '1', name: 'Logo', viewBox: '0 0 100 40', svg: '<svg viewBox="0 0 100 40">...</svg>' },
    ];
    const pluginData = makeSvgPluginData(records, 1);

    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toHaveLength(1);
    expect(result[0]!.viewBox).toBe('0 0 100 40');
  });

  it('reconstructs SvgRecord with error field (SVG-03 export failure)', () => {
    const records: SvgRecord[] = [
      { componentId: '2', name: 'RemoteButton', error: 'SVG export failed: Remote component' },
    ];
    const pluginData = makeSvgPluginData(records, 1);

    const result = assembleSvgChunks(pluginData, TEST_FILE_KEY);

    expect(result).toHaveLength(1);
    expect(result[0]!.error).toBe('SVG export failed: Remote component');
    expect(result[0]!.svg).toBeUndefined();
  });

  it('throws SvgChunkError when a chunk is missing', () => {
    const meta = { chunkCount: 2, totalBytes: 100, recordCount: 2 };
    const pluginData: Record<string, string> = {
      ai_svg_meta: JSON.stringify(meta),
      ai_svg_1: '[{"componentId":"1","name":"A","svg":"<svg/>"}',
      // ai_svg_2 intentionally missing
    };

    expect(() => assembleSvgChunks(pluginData, TEST_FILE_KEY)).toThrow(SvgChunkError);
    expect(() => assembleSvgChunks(pluginData, TEST_FILE_KEY)).toThrow(/Missing SVG chunk/);
  });

  it('attaches the correct fileKey to SvgChunkError', () => {
    const meta = { chunkCount: 2, totalBytes: 100, recordCount: 2 };
    const pluginData: Record<string, string> = {
      ai_svg_meta: JSON.stringify(meta),
      ai_svg_1: '[{"componentId":"1","name":"A","svg":"<svg/>"}',
      // ai_svg_2 intentionally missing
    };

    try {
      assembleSvgChunks(pluginData, 'my-specific-key');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SvgChunkError);
      expect((err as SvgChunkError).fileKey).toBe('my-specific-key');
    }
  });
});
