import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool, releaseScoped } from "../db/pool";
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
  const client: PoolClient = await getPool().connect();
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
