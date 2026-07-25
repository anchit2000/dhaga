import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool, releaseScoped } from "../db/pool";
import { connectWithRetry } from "../db/connect-retry";
import { ensureEeSchema } from "../db/bootstrap";

/**
 * A dedicated (not concurrently-shared) client per tenant-scoped connection.
 * `SELECT set_config(...)` is used instead of a raw `SET app.x = <value>`
 * statement so the user id is a bound query parameter, not string-
 * interpolated SQL. On release the client is reset (`RESET ALL`, see
 * releaseScoped) and returned to the pool for reuse: the tenant GUC never
 * survives into another checkout, so reuse is as safe as discarding was, and
 * it avoids a fresh TCP+auth handshake on every request — the churn a tiny
 * pool would otherwise pay under load. Reuse is only sound under session-mode
 * pooling (one backend pinned per client), which bootstrap.ts enforces.
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
  try {
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [userId]);
  } catch (error) {
    client.release(true);
    throw error;
  }
  return {
    db: drizzle(client),
    release: () => releaseScoped(client),
  };
}
