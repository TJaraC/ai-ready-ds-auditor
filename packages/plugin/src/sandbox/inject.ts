import type { AuditReport, AuditMeta } from '@shared/types';
import { CHUNK_KEY_PREFIX, META_KEY, MAX_CHUNK_BYTES } from '@shared/constants';

export interface InjectionResult {
  chunkCount: number;
  bytesWritten: number;
}

export function injectReport(report: AuditReport): InjectionResult {
  // 1. Serialize the report
  const json = JSON.stringify(report);

  // 2. Measure byte length using TextEncoder (for metadata accuracy only).
  //    TextEncoder is not in ES2019 lib — access via unknown cast (type-safe, no any).
  //    Falls back to character count if TextEncoder is unavailable at runtime.
  type TextEncoderLike = { encode(s: string): Uint8Array };
  const TextEncoderCtor = (
    globalThis as unknown as { TextEncoder?: new () => TextEncoderLike }
  ).TextEncoder;
  const totalBytes: number =
    typeof TextEncoderCtor === 'function'
      ? new TextEncoderCtor().encode(json).length
      : json.length;

  // 3. Clear all existing plugin data keys before writing (DATA-04)
  const existingKeys = figma.root.getPluginDataKeys();
  for (const key of existingKeys) {
    if (key.startsWith(CHUNK_KEY_PREFIX) || key === META_KEY) {
      figma.root.setPluginData(key, '');
    }
  }

  // 4. Split into chunks by CHARACTER count using a conservative bound of 81,000 chars.
  //    This ensures each chunk stays well under the 90kB limit even for non-ASCII JSON.
  const MAX_CHARS = Math.floor(MAX_CHUNK_BYTES * 0.9); // 81,000 chars — conservative bound
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += MAX_CHARS) {
    chunks.push(json.slice(i, i + MAX_CHARS));
  }

  // 5. Write chunks with 1-based keys (DATA-02)
  chunks.forEach((chunk, index) => {
    figma.root.setPluginData(`${CHUNK_KEY_PREFIX}${index + 1}`, chunk);
  });

  // 6. Build and write metadata last (DATA-03)
  const meta: AuditMeta = {
    schemaVersion: report.schemaVersion,
    chunkCount: chunks.length,
    totalBytes,
    fileId: report.fileId,
    fileName: report.fileName,
    scannedAt: report.scannedAt,
    checksum: '',
  };
  figma.root.setPluginData(META_KEY, JSON.stringify(meta));

  // 7. Return result
  return { chunkCount: chunks.length, bytesWritten: totalBytes };
}
