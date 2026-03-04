import type { AuditReport, AuditMeta } from '@ai-ds-auditor/shared';
import { META_KEY, CHUNK_KEY_PREFIX, schemaVersion as currentSchemaVersion } from '@ai-ds-auditor/shared';

export class ChunkReconstructionError extends Error {
  constructor(message: string, public readonly fileKey: string) {
    super(message);
    this.name = 'ChunkReconstructionError';
  }
}

export class SchemaVersionError extends Error {
  constructor(
    public readonly fileVersion: string,
    public readonly serverVersion: string,
    public readonly fileKey: string
  ) {
    super(
      `Schema version mismatch for file "${fileKey}": ` +
      `file has schemaVersion "${fileVersion}", server supports "${serverVersion}". ` +
      `Re-run injection from the plugin to update the stored data.`
    );
    this.name = 'SchemaVersionError';
  }
}

export function reconstructReport(
  pluginData: Record<string, string>,
  fileKey: string
): { report: AuditReport; meta: AuditMeta } {
  const rawMeta = pluginData[META_KEY];

  if (rawMeta === undefined || rawMeta === '') {
    throw new ChunkReconstructionError(
      `No audit data found for file "${fileKey}".\n\n` +
      `To fix:\n` +
      `1. Open the Figma file in Figma Desktop\n` +
      `2. Run the AI-Ready DS Auditor plugin\n` +
      `3. Click "Inject / Update"\n` +
      `4. Try your request again`,
      fileKey
    );
  }

  const meta = JSON.parse(rawMeta) as AuditMeta;

  // Schema version check — skip if versions match
  if (meta.schemaVersion !== currentSchemaVersion) {
    throw new SchemaVersionError(meta.schemaVersion, currentSchemaVersion, fileKey);
  }

  // Concatenate all chunks — chunks are 1-indexed (ai_data_1, ai_data_2, ...)
  let json = '';
  for (let i = 1; i <= meta.chunkCount; i++) {
    const chunkKey = `${CHUNK_KEY_PREFIX}${i}`;
    const chunk = pluginData[chunkKey];

    if (chunk === undefined || chunk === '') {
      throw new ChunkReconstructionError(
        `Missing chunk "${chunkKey}" for file "${fileKey}". ` +
        `Data may be corrupted. Re-run injection from the plugin.`,
        fileKey
      );
    }

    json += chunk;
  }

  // Checksum is currently '' in plugin output — skip validation when empty
  // TODO: Implement checksum verification when plugin starts writing non-empty checksums
  if (meta.checksum !== '' && meta.checksum !== undefined) {
    // Future: verify checksum against json string
    process.stderr.write(`[chunk-reader] Non-empty checksum found but validation not yet implemented\n`);
  }

  const report = JSON.parse(json) as AuditReport;
  return { report, meta };
}
