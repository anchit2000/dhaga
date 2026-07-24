import type { Pool, PoolClient } from "pg";
import {
  DB_CONNECT_RETRY_BASE_MS_DEFAULT,
  DB_CONNECT_RETRY_MAX_DEFAULT,
  isTransientConnectionError,
  poolMaxFromEnv,
} from "@/utils/constants/db";

/**
 * Retry `op` on the transient Supabase session-pool rejection only, with
 * exponential backoff + jitter. Non-transient errors, and exhausted attempts,
 * rethrow unchanged — never swallowed (CLAUDE.md Rule 12).
 */
async function retryTransient<T>(op: () => Promise<T>): Promise<T> {
  const maxAttempts = poolMaxFromEnv(process.env.DB_CONNECT_RETRY_MAX, DB_CONNECT_RETRY_MAX_DEFAULT);
  const baseMs = poolMaxFromEnv(process.env.DB_CONNECT_RETRY_BASE_MS, DB_CONNECT_RETRY_BASE_MS_DEFAULT);
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
 * Make the CORE pool ride out a momentary EMAXCONNSESSION / connect-timeout the
 * same way the EE tenant pool does (packages/ee/src/db/connect-retry.ts).
 *
 * WHY on the pool object rather than a call site: better-auth reads the session
 * on essentially every /app request through this core pool (the auth config
 * imports getDb from @/lib/db), and drizzle drives the pool internally via
 * pool.query()/pool.connect() — there is no explicit connect() to wrap. So the
 * resilience has to live on the pool itself.
 *
 * WHY retrying pool.query is safe: the transient predicate matches only
 * connection-ACQUISITION failures, which happen before the statement runs, so a
 * retry cannot double-execute. A failure mid-query has a different error and is
 * rethrown on the first attempt. The pg callback form is passed straight through
 * untouched (drizzle never uses it) so callback semantics are unchanged.
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
