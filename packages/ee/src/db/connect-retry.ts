import type { Pool, PoolClient } from "pg";

/**
 * Transient-rejection retry for the shared session pool.
 *
 * Supabase's Supavisor runs a FIXED pool_size (15) shared across EVERY warm
 * Vercel instance (see pool.ts). When several instances are warm at once the
 * sum of their per-instance draws can momentarily exceed 15 and Supavisor
 * rejects a new backend — but a slot frees within milliseconds, so the right
 * response is a short backoff-and-retry, not a 500. On the session pooler
 * (5432, today) retry is the graceful lever for a momentary pool_size
 * overshoot; raising Supabase's pool_size is the durable one (see
 * docs/SCALING.md). Pooling MODE is no longer constrained — RLS scoping is
 * transaction-local now (tenant/scoped-db.ts), so the transaction pooler (6543)
 * is equally safe and this retry applies there too.
 *
 * Two entry points share the same transient predicate + backoff:
 *   - connectWithRetry(pool) — a drop-in `pool.connect()` for the EXPLICIT
 *     tenant/admin acquire paths (tenant/scoped-db.ts, admin-db.ts), and
 *   - withConnectRetry(pool) — a pool-object wrapper (applied once in pool.ts)
 *     that also retries drizzle's INTERNAL pool.query()/pool.connect(), so the
 *     many pool-bound `drizzle(getPool())` control-plane reads inherit the same
 *     resilience without an explicit connect() to wrap.
 */

/** Max acquisition attempts (incl. the first); override with DB_CONNECT_RETRY_MAX. */
const CONNECT_RETRY_MAX_DEFAULT = 3;
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
 * Retry `op` on the transient session-pool rejection above only, with
 * exponential backoff + jitter. On a non-transient error, or once attempts are
 * exhausted, the last error is rethrown unchanged — this never swallows a
 * failure (CLAUDE.md Rule 12).
 */
async function retryTransient<T>(op: () => Promise<T>): Promise<T> {
  const maxAttempts = positiveIntFromEnv(process.env.DB_CONNECT_RETRY_MAX, CONNECT_RETRY_MAX_DEFAULT);
  const baseMs = positiveIntFromEnv(process.env.DB_CONNECT_RETRY_BASE_MS, CONNECT_RETRY_BASE_MS_DEFAULT);
  for (let attempt = 1; ; attempt++) {
    try {
      return await op();
    } catch (error) {
      if (attempt >= maxAttempts || !isTransientConnectionError(error)) throw error;
      const backoff = baseMs * 2 ** (attempt - 1);
      const jitter = Math.random() * baseMs;
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }
  }
}

/**
 * Acquire a pooled client, retrying ONLY the transient rejection above. On a
 * non-transient error, or once attempts are exhausted, the last error is
 * rethrown unchanged. Drop-in for `pool.connect()`; used by the explicit
 * tenant/admin scope acquire paths (tenant/scoped-db.ts, admin-db.ts).
 */
export async function connectWithRetry(pool: Pool): Promise<PoolClient> {
  return retryTransient<PoolClient>(() => pool.connect());
}

/**
 * Patch the shared EE tenant pool so drizzle's INTERNAL pool.query()/
 * pool.connect() ride out a momentary EMAXCONNSESSION / connect-timeout (a slot
 * frees within ms) instead of throwing — mirrors the core pool wrapper
 * (apps/web/src/lib/db/connect-retry.ts). Applied ONCE where getPool() memoizes
 * the pool (pool.ts).
 *
 * WHY on the pool object: the EE control-plane repos that read via
 * `drizzle(getPool())` (admin/repo.ts, access-requests/repo.ts, billing/repo.ts,
 * referrals/repo.ts, referrals/reward.ts, admin/subscription-admin/) are
 * pool-bound — drizzle drives the pool internally through pool.query() (and
 * pool.connect() for its `.transaction()`), with no explicit connect() to wrap.
 * So the resilience has to live on the pool itself for those reads to inherit it.
 *
 * WHY retrying pool.query is safe: the transient predicate matches only
 * connection-ACQUISITION failures, which happen before the statement runs, so a
 * retry cannot double-execute. A failure mid-query has a different error and is
 * rethrown on the first attempt. The pg callback form is passed straight through
 * untouched (drizzle never uses it) so callback semantics are unchanged.
 *
 * The explicit connectWithRetry(getPool()) acquire paths (tenant/admin) now sit
 * atop a pool whose connect() also retries — a redundant but benign outer layer:
 * both layers retry only the same transient error a bounded number of times, so
 * the worst case is a few extra attempts before the same eventual throw, never a
 * wrong result or a leaked client.
 */
export function withConnectRetry(pool: Pool): Pool {
  const originalConnect = pool.connect.bind(pool);
  const originalQuery = pool.query.bind(pool);

  // `as unknown as` (not `any`): the runtime patch is correct but pg's
  // overloaded connect/query signatures don't statically model it — the
  // standard monkey-patch idiom, no @ts-ignore needed.
  const patchedConnect = (...args: unknown[]): unknown => {
    if (typeof args[0] === "function") return (originalConnect as (...a: unknown[]) => unknown)(...args);
    return retryTransient<PoolClient>(() => (originalConnect as () => Promise<PoolClient>)());
  };
  const patchedQuery = (...args: unknown[]): unknown => {
    if (typeof args[args.length - 1] === "function") {
      return (originalQuery as (...a: unknown[]) => unknown)(...args);
    }
    return retryTransient(() => (originalQuery as (...a: unknown[]) => Promise<unknown>)(...args));
  };
  pool.connect = patchedConnect as unknown as typeof pool.connect;
  pool.query = patchedQuery as unknown as typeof pool.query;

  return pool;
}
