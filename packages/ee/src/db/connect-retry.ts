import type { Pool, PoolClient } from "pg";

/**
 * Transient-rejection retry for the shared session pool.
 *
 * Supabase's Supavisor runs a FIXED pool_size (15) shared across EVERY warm
 * Vercel instance (see pool.ts). When several instances are warm at once the
 * sum of their per-instance draws can momentarily exceed 15 and Supavisor
 * rejects a new backend — but a slot frees within milliseconds, so the right
 * response is a short backoff-and-retry, not a 500. Session mode itself cannot
 * change (tenant scoping rides on session-level GUCs; bootstrap.ts enforces
 * port 5432), so retry is the graceful lever; raising Supabase's pool_size is
 * the durable one (see docs/SCALING.md).
 */

/** Max acquisition attempts (incl. the first); override with DB_CONNECT_RETRY_MAX. */
const CONNECT_RETRY_MAX_DEFAULT = 5;
/** First backoff step in ms (doubles each retry); override with DB_CONNECT_RETRY_BASE_MS. */
const CONNECT_RETRY_BASE_MS_DEFAULT = 100;

/** Parse a positive integer from env, falling back on missing/NaN/non-positive. */
function positiveIntFromEnv(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * True ONLY for the transient session-pool rejections above — the ones a retry
 * can clear because a slot frees on its own within ms:
 *  - Supavisor's `XX000 … max clients reached in session mode` (also surfaced
 *    by some drivers with code `EMAXCONNSESSION`), and
 *  - node-postgres' own `timeout exceeded when trying to connect`, thrown when
 *    the local pool can't hand out a client inside connectionTimeoutMillis.
 * Everything else (auth failure, bad SQL, a real network drop) is NOT transient
 * and must fail loud on the first attempt — this predicate returns false for it.
 */
export function isTransientConnectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message : "";
  if (code === "EMAXCONNSESSION") return true;
  if (code === "XX000" && /max clients reached/i.test(text)) return true;
  return /timeout exceeded when trying to connect/i.test(text);
}

/**
 * Acquire a pooled client, retrying ONLY the transient rejection above with
 * exponential backoff + jitter. On a non-transient error, or once attempts are
 * exhausted, the last error is rethrown unchanged — this never swallows a
 * failure (CLAUDE.md Rule 12). Drop-in for `pool.connect()`.
 */
export async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  const maxAttempts = positiveIntFromEnv(process.env.DB_CONNECT_RETRY_MAX, CONNECT_RETRY_MAX_DEFAULT);
  const baseMs = positiveIntFromEnv(process.env.DB_CONNECT_RETRY_BASE_MS, CONNECT_RETRY_BASE_MS_DEFAULT);
  for (let attempt = 1; ; attempt++) {
    try {
      return await pool.connect();
    } catch (error) {
      if (attempt >= maxAttempts || !isTransientConnectionError(error)) throw error;
      const backoff = baseMs * 2 ** (attempt - 1);
      const jitter = Math.random() * baseMs;
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }
  }
}
