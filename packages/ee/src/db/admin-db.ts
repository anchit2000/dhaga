import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool, releaseScoped } from "./pool";
import { connectWithRetry } from "./connect-retry";
import { ensureEeSchema } from "./bootstrap";

/**
 * Sees every tenant's rows — for the admin panel and the Stripe webhook
 * only. Never exposed to a request path that isn't already behind an
 * `isAdmin` check or a verified webhook signature. `app.bypass_rls` is
 * checked by every RLS policy in rls-ddl.ts.
 *
 * Same TRANSACTION-scoped treatment as the tenant path (tenant/scoped-db.ts):
 * the bypass runs inside one `BEGIN … COMMIT` with `app.bypass_rls` set
 * TRANSACTION-LOCAL (`is_local = true`). Being transaction-local it is gone the
 * moment the transaction ends, so it can never leak `app.bypass_rls` into a
 * subsequent tenant checkout on a reused connection — no `RESET ALL` needed
 * (see releaseScoped), and the same code is safe on both the session pooler
 * (5432) and the transaction pooler (6543). The returned `{ db, release }`
 * shape is unchanged for callers (admin/usage.ts, admin/subscription-admin.ts):
 * they run their queries on `db` and `release()` in a `finally`. The
 * transaction spans that work — bounded to a query or two per admin op — and
 * `release()` commits it. (Those callers never open a nested
 * `db.transaction()` on this `db`; if one ever did it would end this scope's
 * transaction early — fails closed, RLS then returns no rows.)
 */
export async function openAdminConnection() {
  await ensureEeSchema(getPool());
  // Retry a momentary EMAXCONNSESSION/connect-timeout on acquisition rather
  // than 500 the admin panel / Stripe webhook (see connectWithRetry).
  const client: PoolClient = await connectWithRetry(getPool());
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('app.bypass_rls', 'true', true)");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* connection already unusable — the destroy below is what matters */
    }
    client.release(true);
    throw error;
  }
  return {
    db: drizzle(client),
    release: async (): Promise<void> => {
      try {
        // COMMIT ends the bypass transaction; on an aborted txn (the caller's
        // query errored) Postgres treats COMMIT as ROLLBACK, so it closes
        // cleanly either way and the transaction-local bypass is discarded.
        await client.query("COMMIT");
      } catch {
        try {
          await client.query("ROLLBACK");
        } catch {
          client.release(true);
          return;
        }
      }
      releaseScoped(client);
    },
  };
}
