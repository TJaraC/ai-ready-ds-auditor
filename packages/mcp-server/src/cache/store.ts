import type { AuditReport, AuditMeta } from '@ai-ds-auditor/shared';
import { fetchFigmaFile } from '../figma/client.js';
import { reconstructReport } from '../figma/chunk-reader.js';

export interface CacheEntry {
  fileKey: string;
  fileName: string;
  report: AuditReport;
  meta: AuditMeta;
  fetchedAt: number; // Date.now() timestamp
}

export class DesignSystemCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly token: string;
  private readonly fileKeys: readonly string[];

  constructor(token: string, fileKeys: string[]) {
    this.token = token;
    this.fileKeys = fileKeys;
  }

  get configuredFileKeys(): readonly string[] {
    return this.fileKeys;
  }

  has(fileKey: string): boolean {
    return this.entries.has(fileKey);
  }

  get(fileKey: string): CacheEntry | undefined {
    return this.entries.get(fileKey);
  }

  /**
   * Returns cached entry if present. On cache miss, fetches from Figma API
   * and reconstructs the AuditReport from plugin chunks.
   *
   * MCP-06: No redundant API calls while cache is valid.
   * MCP-02: Exactly one API call per file per session.
   */
  async ensureLoaded(fileKey: string): Promise<CacheEntry> {
    const cached = this.entries.get(fileKey);
    if (cached !== undefined) {
      return cached;
    }

    process.stderr.write(`[cache] Cache miss for "${fileKey}" — fetching from Figma API\n`);

    const fileResponse = await fetchFigmaFile(fileKey, this.token);

    // pluginData is on the DOCUMENT root node
    // If undefined, reconstructReport will throw ChunkReconstructionError with instructions
    const pluginData = fileResponse.document.pluginData ?? {};

    const { report, meta } = reconstructReport(pluginData, fileKey);

    const entry: CacheEntry = {
      fileKey,
      fileName: fileResponse.name,
      report,
      meta,
      fetchedAt: Date.now(),
    };

    this.entries.set(fileKey, entry);
    process.stderr.write(`[cache] Loaded "${fileResponse.name}" (${fileKey}) — ${meta.chunkCount} chunks, ${meta.totalBytes} bytes\n`);

    return entry;
  }

  /**
   * Returns the first configured file key, or throws if none configured.
   * Used by tools when no fileKey is provided by the caller.
   */
  defaultFileKey(): string {
    const key = this.fileKeys[0];
    if (key === undefined) {
      throw new Error('No Figma files configured. Set FIGMA_FILE_KEYS environment variable.');
    }
    return key;
  }
}
