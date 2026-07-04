import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";

/**
 * A dedicated (not pool-shared) client per tenant-scoped connection.
 * `SELECT set_config(...)` is used instead of a raw `SET app.x = <value>`
 * statement so the user id is a bound query parameter, not string-
 * interpolated SQL. The client is *discarded* on release (never returned to
 * the pool) — resetting session state perfectly is easy to get subtly wrong,
 * and a wrong reset here is a cross-tenant data leak, not a crash. Discarding
 * costs a fresh TCP+auth handshake next time; that's the trade worth making.
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
    release: () => client.release(true),
  };
}
