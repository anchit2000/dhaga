import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool, releaseScoped } from "../db/pool";
import { connectWithRetry } from "../db/connect-retry";
import { ensureEeSchema } from "../db/bootstrap";

/**
 * A dedicated (not concurrently-shared) client per tenant-scoped connection.
 * Tenant scoping is TRANSACTION-scoped: each unit of work runs inside one
 * `BEGIN … COMMIT` whose first statement is
 * `SELECT set_config('app.current_user_id', $1, true)` — a bound query
 * parameter (never string-interpolated) set TRANSACTION-LOCAL (`is_local =
 * true`). Because the setting is transaction-local it is discarded the instant
 * the transaction ends, so:
 *   - a client reused for the next checkout can never carry the previous
 *     tenant's scope (no `RESET ALL` needed on release — see releaseScoped),
 *     and
 *   - the exact same code is correct on a session-mode pooler (one backend
 *     pinned per client, port 5432) AND a transaction-mode pooler (a backend
 *     per transaction, port 6543): the scope lives entirely inside one
 *     transaction, so the pooler never has a chance to run it unscoped or leak
 *     it. Flipping between the two is a DATABASE_URL change, no code change.
 *
 * Two ways to run inside that transaction, for two lifecycles:
 *   - `run(fn)` — a bounded unit of work (withUserDb, and via cachePerUser every
 *     cached read). drizzle manages BEGIN/COMMIT/ROLLBACK; the tenant GUC is the
 *     first statement in the txn, and a throw rolls back and rethrows.
 *   - `begin()` — a request-lifetime pin (RSC page reads via
 *     getRequestScopedDb), where there is no single callback to wrap. It opens
 *     the transaction, sets the local GUC, and returns the db held open until
 *     release() commits it. Every read on that db runs inside the one
 *     transaction, so each is RLS-scoped even on a transaction-mode pooler.
 *     Invariant: do NOT open a nested top-level `db.transaction()` on the
 *     begin() db — it would COMMIT this scope's transaction early. (Fails
 *     CLOSED if ever violated: with the GUC gone, RLS returns no rows, never
 *     another tenant's.) Holds today — writes/transactions run under run(), not
 *     RSC render.
 */
export async function openTenantConnection(userId: string) {
  await ensureEeSchema(getPool());
  // getPool().connect() through a retry that rides out a momentary
  // EMAXCONNSESSION/connect-timeout (see connectWithRetry) — this is the
  // hottest choke point: every authed request opens a tenant connection here.
  const acquireStartedMs = performance.now();
  const client: PoolClient = await connectWithRetry(getPool());
  // Opt-in prod diagnostic (set DB_TIMING_LOG=1): log how long acquiring a
  // tenant connection takes, PII-free. A large value (seconds) means the cost is
  // the physical connect/handshake — a cold, region-away, or saturated pool,
  // which is an INFRA lever (co-locate / keep warm / raise pool_size), not query
  // work. A small value alongside slow pages points at the queries or cold
  // function start instead. This is the number that decides infra-vs-code for
  // the ~10s floor.
  if (process.env.DB_TIMING_LOG) {
    console.log(`[db-timing] tenant connect acquire=${Math.round(performance.now() - acquireStartedMs)}ms`);
  }
  // `drizzle(client)` is bound to this one checked-out client (not the pool),
  // so its `.transaction()` runs BEGIN/COMMIT on THIS backend — the whole scope
  // stays on one connection.
  const scopedDb = drizzle(client);
  let heldTxnOpen = false;

  return {
    async run<T>(fn: (scopedDb: NodePgDatabase) => Promise<T>): Promise<T> {
      return scopedDb.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
        return fn(tx);
      });
    },
    async begin(): Promise<NodePgDatabase> {
      await client.query("BEGIN");
      try {
        await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* connection already unusable — the destroy below is what matters */
        }
        client.release(true);
        throw error;
      }
      heldTxnOpen = true;
      return scopedDb;
    },
    async release(): Promise<void> {
      if (heldTxnOpen) {
        heldTxnOpen = false;
        try {
          // COMMIT ends the held begin() transaction. On an aborted txn (a read
          // errored mid-render) Postgres treats COMMIT as ROLLBACK, so this
          // closes it cleanly either way.
          await client.query("COMMIT");
        } catch {
          try {
            await client.query("ROLLBACK");
          } catch {
            client.release(true); // can't end the txn — never return it dirty
            return;
          }
        }
      }
      releaseScoped(client);
    },
  };
}
