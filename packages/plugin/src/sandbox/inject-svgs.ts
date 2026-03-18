import type { SvgRecord } from '@shared/types';
import { SVG_CHUNK_KEY_PREFIX, SVG_META_KEY } from '@shared/constants';
import { serializeSvgStore } from './serialize-svgs';

export interface SvgInjectionResult {
  chunkCount: number;
  bytesWritten: number;
  recordCount: number;
}

/**
 * injectSvgs — writes SvgRecord[] to Figma plugin data storage.
 *
 * Parallel to injectReport — uses separate ai_svg_* keys to avoid
 * interfering with the report chunks (ai_data_*).
 *
 * Protocol:
 *   1. Clear all existing ai_svg_* + ai_svg_meta keys (prevents stale chunks from smaller previous store)
 *   2. Write chunks with 1-based keys: ai_svg_1, ai_svg_2, ...
 *   3. Write ai_svg_meta last (JSON with chunkCount, totalBytes, recordCount)
 */
export function injectSvgs(records: SvgRecord[]): SvgInjectionResult {
  const payload = serializeSvgStore(records);

  // Clear existing SVG keys before writing
  const existingKeys = figma.root.getPluginDataKeys();
  for (const key of existingKeys) {
    if (key.startsWith(SVG_CHUNK_KEY_PREFIX) || key === SVG_META_KEY) {
      figma.root.setPluginData(key, '');
    }
  }

  // Write SVG chunks with 1-based keys
  payload.chunks.forEach((chunk, index) => {
    figma.root.setPluginData(`${SVG_CHUNK_KEY_PREFIX}${index + 1}`, chunk);
  });

  // Write SVG meta last
  figma.root.setPluginData(
    SVG_META_KEY,
    JSON.stringify({
      chunkCount: payload.chunkCount,
      totalBytes: payload.totalBytes,
      recordCount: records.length,
    })
  );

  return {
    chunkCount: payload.chunkCount,
    bytesWritten: payload.totalBytes,
    recordCount: records.length,
  };
}
