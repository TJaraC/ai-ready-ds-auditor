import type { SvgRecord } from '@ai-ds-auditor/shared';
import { SVG_CHUNK_KEY_PREFIX, SVG_META_KEY } from '@ai-ds-auditor/shared';

export class SvgChunkError extends Error {
  constructor(message: string, public readonly fileKey: string) {
    super(message);
    this.name = 'SvgChunkError';
  }
}

interface SvgStoreMeta {
  chunkCount: number;
  totalBytes: number;
  recordCount: number;
}

/**
 * assembleSvgChunks — reads SVG store from plugin data.
 * Returns empty array when no SVG meta exists (SVG store is optional — not all files have SVGs injected).
 * Parallel to assembleChunks in chunk-reader.ts for the report store.
 */
export function assembleSvgChunks(
  pluginData: Record<string, string>,
  fileKey: string
): SvgRecord[] {
  const rawMeta = pluginData[SVG_META_KEY];

  // SVG store is optional — return empty if not present
  if (rawMeta === undefined || rawMeta === '') {
    return [];
  }

  const meta = JSON.parse(rawMeta) as SvgStoreMeta;

  let json = '';
  for (let i = 1; i <= meta.chunkCount; i++) {
    const chunkKey = `${SVG_CHUNK_KEY_PREFIX}${i}`;
    const chunk = pluginData[chunkKey];
    if (chunk === undefined || chunk === '') {
      throw new SvgChunkError(
        `Missing SVG chunk "${chunkKey}" for file "${fileKey}". ` +
        `SVG data may be incomplete. Re-run injection from the plugin.`,
        fileKey
      );
    }
    json += chunk;
  }

  return JSON.parse(json) as SvgRecord[];
}
