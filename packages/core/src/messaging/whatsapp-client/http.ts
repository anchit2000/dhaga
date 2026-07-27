/**
 * Bounded HTTP retry for WhatsApp Graph API calls. Mirrors the resilience of
 * ../../search/firecrawl-client: exponential backoff + jitter, retrying only
 * transient failures — network/abort/timeout rejections and HTTP
 * 408/409/429/5xx. Other 4xx (bad token, bad request) bail immediately.
 *
 * Tunables are local to the module (CLAUDE.md file-org rule — no shared
 * constants module fits). `label` names the operation in thrown errors and
 * MUST NOT carry PII (message body, recipient id).
 */
const GRAPH_TIMEOUT_MS = 15_000;
const GRAPH_MAX_RETRIES = 2;
const GRAPH_BACKOFF_BASE_MS = 500;
const GRAPH_BACKOFF_JITTER_MS = 250;

/** Transient HTTP statuses worth retrying (plus any 5xx). */
const RETRIABLE_HTTP_STATUSES: ReadonlySet<number> = new Set([408, 409, 429]);

function isRetriableStatus(status: number): boolean {
  return status >= 500 || RETRIABLE_HTTP_STATUSES.has(status);
}

function backoffDelayMs(attempt: number): number {
  return GRAPH_BACKOFF_BASE_MS * 2 ** attempt + Math.random() * GRAPH_BACKOFF_JITTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with bounded retry. Resolves only with an ok Response; otherwise throws. */
export async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= GRAPH_MAX_RETRIES; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS) });
    } catch (error) {
      // fetch() rejects on network/abort/timeout — transient, retry below.
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (response) {
      if (response.ok) return response;
      lastError = new Error(`${label} failed (HTTP ${response.status})`);
      if (!isRetriableStatus(response.status)) throw lastError;
    }

    if (attempt < GRAPH_MAX_RETRIES) {
      await sleep(backoffDelayMs(attempt));
    }
  }

  throw lastError ?? new Error(`${label} failed`);
}
