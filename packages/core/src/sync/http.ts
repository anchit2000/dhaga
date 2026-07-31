/**
 * Bounded HTTP retry shared by the server-side address-book providers (Google
 * People, Microsoft Graph).
 *
 * Shared rather than copied into each provider because what is being defended
 * against is identical: both throttle a large account hard, and neither failure
 * mode is cheap here. A throttled READ aborts the whole run; a throttled WRITE
 * is counted into "N change(s) could not be written and will retry", which is a
 * promise the run can only keep if it eventually stops being throttled.
 *
 * Two rules the sibling loops in ../messaging and ../search do not have:
 *  - `Retry-After` beats the exponential step. When a provider states how long
 *    to wait, retrying sooner is how a throttle becomes a harder throttle.
 *  - A wait longer than MAX_DELAY_MS is refused rather than slept through. This
 *    runs inside a request, and a quota reset can name an hour; failing now with
 *    a truthful error beats holding a serverless invocation open until it dies.
 *
 * Errors carry the HTTP status and a caller-supplied label ONLY. Provider error
 * bodies can quote the user's contacts, and third-party PII must never reach a
 * plaintext server log.
 */

const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 500;
const BACKOFF_JITTER_MS = 250;
/** Longer than this and the request gives up rather than waiting it out. */
const MAX_DELAY_MS = 30_000;

/** Transient statuses worth retrying, on top of any 5xx. */
const RETRIABLE_HTTP_STATUSES: ReadonlySet<number> = new Set([408, 429]);

/**
 * Google answers a rate limit with 403 and one of these reasons rather than
 * 429, so status alone cannot classify it. Matched on the reason string, which
 * makes the check provider-neutral: a 403 that says "quota exceeded" is a rate
 * limit whoever sent it, and Microsoft (which uses 429) never trips it.
 */
const RATE_LIMIT_REASONS: ReadonlySet<string> = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
]);

/** The shape of the error envelope we peek at — never surfaced, only classified. */
interface RateLimitErrorBody {
  error?: {
    status?: string;
    errors?: { reason?: string }[];
  };
}

/** An HTTP failure from a contact-sync provider. Carries the status, never a body. */
export class SyncHttpError extends Error {
  readonly status: number;

  constructor(label: string, status: number) {
    super(`${label} failed (HTTP ${status})`);
    this.name = "SyncHttpError";
    this.status = status;
  }
}

/**
 * HTTP 410 GONE: the provider's incremental cursor is dead (Google says so when
 * a syncToken ages out, Graph when a deltaLink needs `resyncRequired`). The only
 * recovery is to drop the cursor and enumerate everything again.
 */
export function isCursorExpired(error: unknown): boolean {
  return error instanceof SyncHttpError && error.status === 410;
}

/** Consumes and DISCARDS the body: it is read to classify, never to report. */
async function isRateLimited403(response: Response): Promise<boolean> {
  try {
    const body = (await response.json()) as RateLimitErrorBody;
    if (body.error?.status === "RESOURCE_EXHAUSTED") return true;
    return (body.error?.errors ?? []).some(({ reason }) =>
      reason ? RATE_LIMIT_REASONS.has(reason) : false,
    );
  } catch {
    // An unparseable body proves nothing; treat the 403 as the permission
    // failure it usually is and fail fast rather than retrying a dead grant.
    return false;
  }
}

async function isRetriable(response: Response): Promise<boolean> {
  if (response.status >= 500) return true;
  if (RETRIABLE_HTTP_STATUSES.has(response.status)) return true;
  if (response.status === 403) return isRateLimited403(response);
  return false;
}

/** `Retry-After` as milliseconds — delta-seconds or an HTTP-date. */
function statedDelayMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

function backoffMs(attempt: number): number {
  // Jitter matters more than the step size: every connection for one user runs
  // sequentially, so without it a retry storm re-synchronises on each 429.
  return BACKOFF_BASE_MS * 2 ** attempt + Math.random() * BACKOFF_JITTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch with bounded retry. Resolves only with an ok Response; otherwise throws. */
export async function fetchWithSyncRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response | null = null;
    let delayMs: number | null = null;

    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      // fetch() rejects on network/abort/timeout — transient, retried below.
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (response) {
      if (response.ok) return response;
      lastError = new SyncHttpError(label, response.status);
      if (!(await isRetriable(response))) throw lastError;
      delayMs = statedDelayMs(response) ?? backoffMs(attempt);
      if (delayMs > MAX_DELAY_MS) throw lastError;
    }

    if (attempt < MAX_RETRIES) await sleep(delayMs ?? backoffMs(attempt));
  }

  throw lastError ?? new Error(`${label} failed`);
}
