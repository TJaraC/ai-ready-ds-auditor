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

/**
 * assembleChunks — reads meta, concatenates chunks into raw JSON string.
 * Does NOT parse JSON or validate schema version.
 * Independently testable with plain Record<string, string>.
 */
export function assembleChunks(
  pluginData: Record<string, string>,
  fileKey: string
): { json: string; meta: AuditMeta } {
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

  return { json, meta };
}

/**
 * parseReport — validates schema version and parses JSON into AuditReport.
 * Independently testable: accepts pre-assembled JSON string and meta object.
 */
export function parseReport(
  json: string,
  meta: AuditMeta,
  fileKey: string
): { report: AuditReport; meta: AuditMeta } {
  if (meta.schemaVersion !== currentSchemaVersion) {
    throw new SchemaVersionError(meta.schemaVersion, currentSchemaVersion, fileKey);
  }

  // Checksum skip: empty checksum is current plugin behavior
  if (meta.checksum !== '' && meta.checksum !== undefined) {
    process.stderr.write(`[chunk-reader] Non-empty checksum found but validation not yet implemented\n`);
  }

  const report = JSON.parse(json) as AuditReport;
  return { report, meta };
}

/**
 * reconstructReport — backward-compatible wrapper.
 * Primary API for existing callers. Calls assembleChunks then parseReport.
 * Exported signature is unchanged from v1.0.
 */
export function reconstructReport(
  pluginData: Record<string, string>,
  fileKey: string
): { report: AuditReport; meta: AuditMeta } {
  const { json, meta } = assembleChunks(pluginData, fileKey);
  return parseReport(json, meta, fileKey);
}
