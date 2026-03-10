import type { AuditReport } from '@shared/types';
import type { ChunkPayload } from '@shared/types';
import { MAX_CHUNK_BYTES } from '@shared/constants';

/**
 * serializeReport — pure serialization function.
 *
 * Converts an AuditReport to chunked string slices for plugin data storage.
 * Has zero Figma global imports — independently testable in Vitest.
 *
 * Chunk boundary: character count with conservative bound of 81,000 chars
 * (MAX_CHUNK_BYTES * 0.9) to stay under the 100kB Figma setPluginData limit
 * even for non-ASCII JSON.
 *
 * Byte measurement: uses TextEncoder when available (injected via globalThis cast),
 * falls back to character count.
 *
 * CRITICAL: The TextEncoder cast pattern must be preserved exactly as-is —
 * this avoids ES2019 lib type issues in the plugin runtime.
 */
export function serializeReport(report: AuditReport): ChunkPayload {
  const json = JSON.stringify(report);

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

  return { chunks, totalBytes, chunkCount: chunks.length };
}
