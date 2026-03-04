import type { GetFileResponse } from './types.js';
import {
  FigmaPermissionError,
  FigmaRateLimitError,
  FigmaMonthlyLimitError,
  FigmaApiError,
} from './types.js';

// Plugin manifest ID — used as plugin_data query param to access setPluginData keys
const PLUGIN_ID = '1610802699324330019';

// Monthly rate limit threshold: Retry-After > 1 hour signals quota exhaustion
const MONTHLY_LIMIT_THRESHOLD_SECONDS = 3600;

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  fileKey: string,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status !== 429) return response;

    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);

    if (retryAfter > MONTHLY_LIMIT_THRESHOLD_SECONDS) {
      throw new FigmaMonthlyLimitError(fileKey);
    }

    if (attempt < maxRetries) {
      await new Promise<void>((resolve) => setTimeout(resolve, retryAfter * 1000));
    } else {
      throw new FigmaRateLimitError(fileKey, retryAfter);
    }
  }

  // Should not reach here
  throw new FigmaApiError(fileKey, 429);
}

export async function fetchFigmaFile(
  fileKey: string,
  token: string
): Promise<GetFileResponse> {
  const url = `https://api.figma.com/v1/files/${fileKey}?plugin_data=${PLUGIN_ID}`;
  const headers = { 'X-Figma-Token': token };

  const response = await fetchWithRetry(url, headers, fileKey);

  if (response.status === 403) {
    throw new FigmaPermissionError(fileKey);
  }

  if (!response.ok) {
    throw new FigmaApiError(fileKey, response.status);
  }

  return response.json() as Promise<GetFileResponse>;
}
