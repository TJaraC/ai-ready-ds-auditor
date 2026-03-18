import type { SvgRecord, ChunkPayload } from '@shared/types';
import { MAX_CHUNK_BYTES } from '@shared/constants';

/**
 * serializeSvgStore — pure serialization function, parallel to serializeReport.
 *
 * Converts SvgRecord[] to chunked string slices for plugin data storage.
 * Has zero Figma global imports — independently testable in Vitest.
 *
 * Chunk boundary: character count with conservative bound of 81,000 chars
 * (MAX_CHUNK_BYTES * 0.9) to stay under the 100kB Figma setPluginData limit
 * even for non-ASCII SVG content.
 *
 * Byte measurement: uses TextEncoder when available (injected via globalThis cast),
 * falls back to character count. Same pattern as serializeReport.
 */
export function serializeSvgStore(records: SvgRecord[]): ChunkPayload {
  const json = JSON.stringify(records);

  // Measure byte length using TextEncoder (for metadata accuracy only).
  // TextEncoder is not in ES2019 lib — access via unknown cast (type-safe, no any).
  // Falls back to character count if TextEncoder is unavailable at runtime.
  type TextEncoderLike = { encode(s: string): Uint8Array };
  const TextEncoderCtor = (
    globalThis as unknown as { TextEncoder?: new () => TextEncoderLike }
  ).TextEncoder;
  const totalBytes: number =
    typeof TextEncoderCtor === 'function'
      ? new TextEncoderCtor().encode(json).length
      : json.length;

  // Split into chunks by CHARACTER count using a conservative bound.
  const MAX_CHARS = Math.floor(MAX_CHUNK_BYTES * 0.9); // 81,000 chars
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += MAX_CHARS) {
    chunks.push(json.slice(i, i + MAX_CHARS));
  }
  // Guard: empty input produces valid JSON array in a single chunk
  if (chunks.length === 0) chunks.push(json);

  return { chunks, totalBytes, chunkCount: chunks.length };
}
