import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";
import { getPool, releaseScoped } from "./pool";
import { ensureEeSchema } from "./bootstrap";

/**
 * Sees every tenant's rows — for the admin panel and the Stripe webhook
 * only. Never exposed to a request path that isn't already behind an
 * `isAdmin` check or a verified webhook signature. `app.bypass_rls` is
 * checked by every RLS policy in rls-ddl.ts.
 */
export async function openAdminConnection() {
  await ensureEeSchema(getPool());
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("SELECT set_config('app.bypass_rls', 'true', false)");
  } catch (error) {
    client.release(true);
    throw error;
  }
  return {
    db: drizzle(client),
    release: () => releaseScoped(client),
  };
}
