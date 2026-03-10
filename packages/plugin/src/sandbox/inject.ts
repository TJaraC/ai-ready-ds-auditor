import type { AuditReport, AuditMeta, InjectionResult } from '@shared/types';
import { CHUNK_KEY_PREFIX, META_KEY } from '@shared/constants';
import { serializeReport } from './serialize';

export function injectReport(report: AuditReport): InjectionResult {
  const payload = serializeReport(report);

  // Clear all existing plugin data keys before writing (DATA-04)
  const existingKeys = figma.root.getPluginDataKeys();
  for (const key of existingKeys) {
    if (key.startsWith(CHUNK_KEY_PREFIX) || key === META_KEY) {
      figma.root.setPluginData(key, '');
    }
  }

  // Write chunks with 1-based keys (DATA-02)
  payload.chunks.forEach((chunk, index) => {
    figma.root.setPluginData(`${CHUNK_KEY_PREFIX}${index + 1}`, chunk);
  });

  // Build and write metadata last (DATA-03)
  const meta: AuditMeta = {
    schemaVersion: report.schemaVersion,
    chunkCount: payload.chunkCount,
    totalBytes: payload.totalBytes,
    fileId: report.fileId,
    fileName: report.fileName,
    scannedAt: report.scannedAt,
    checksum: '',
  };
  figma.root.setPluginData(META_KEY, JSON.stringify(meta));

  return { chunkCount: payload.chunkCount, bytesWritten: payload.totalBytes };
}
