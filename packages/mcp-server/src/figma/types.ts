// Figma REST API response types — hand-typed for our needs (no extra deps)
// plugin_data query param adds pluginData to each node in the response

export interface FigmaNode {
  id: string;
  type: string;
  name?: string;
  pluginData?: Record<string, Record<string, string>>; // { [pluginId]: { [key]: value } }
  sharedPluginData?: Record<string, Record<string, string>>;
  children?: FigmaNode[];
}

export interface GetFileResponse {
  document: FigmaNode; // type === "DOCUMENT", carries pluginData at root
  name: string;
  lastModified: string;
  version: string;
}

// Structured error classes — tools catch these and return actionable text content

export class FigmaPermissionError extends Error {
  constructor(public readonly fileKey: string) {
    super(
      `Access denied to Figma file "${fileKey}".\n\n` +
      `To fix:\n` +
      `1. Open the Figma file in your browser\n` +
      `2. Click "Share" in the top right\n` +
      `3. Change sharing to "Anyone with the link can view"\n` +
      `4. Try your request again`
    );
    this.name = 'FigmaPermissionError';
  }
}

export class FigmaRateLimitError extends Error {
  constructor(
    public readonly fileKey: string,
    public readonly retryAfterSeconds: number
  ) {
    super(
      `Figma API rate limit hit for file "${fileKey}". ` +
      `Retry after ${retryAfterSeconds} seconds.`
    );
    this.name = 'FigmaRateLimitError';
  }
}

export class FigmaMonthlyLimitError extends Error {
  constructor(public readonly fileKey: string) {
    super(
      `Figma API monthly rate limit reached for file "${fileKey}".\n\n` +
      `The free Figma Starter plan allows only 6 GET /v1/files requests per month. ` +
      `Your quota is exhausted for this month.\n\n` +
      `Options:\n` +
      `1. Wait until the next billing cycle\n` +
      `2. Upgrade to a Figma Professional plan for higher limits\n` +
      `3. Use the cached data if still available from a previous session`
    );
    this.name = 'FigmaMonthlyLimitError';
  }
}

export class FigmaApiError extends Error {
  constructor(public readonly fileKey: string, public readonly status: number) {
    super(`Figma API error ${status} for file "${fileKey}"`);
    this.name = 'FigmaApiError';
  }
}
