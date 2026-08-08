import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../../db/pool";
import { ensureEeSchema } from "../../db/bootstrap";

/** `subscriptions` has NO RLS (db/tables-ddl) — a plain pool connection on EE's
 *  own pool is enough, and it is deliberately NOT the request-scoped tenant
 *  pool: billing writes must not consume one of its three checkouts. */
export async function billingDb() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}
