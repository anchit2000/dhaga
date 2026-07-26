import { Pool } from "pg";
import type { PoolClient } from "pg";
import { withConnectRetry } from "./connect-retry";

/**
 * EE connects to the exact same Postgres database as core (same tables) —
 * RLS is what separates tenants, not a different connection target. A
 * separate pool from core's own (apps/web/src/lib/db/index.ts) so tenant-
 * scoped connections never contend with or get confused for core's plain
 * global connection.
 */

/** Default max for this tenant pool; override with DB_POOL_MAX_TENANT. */
const TENANT_POOL_MAX_DEFAULT = 3;
/** Default acquire timeout; override with DB_POOL_CONNECTION_TIMEOUT_MS.
 *  node-postgres counts the FULL acquisition here — including establishing a
 *  brand-new physical connection (TCP+TLS+SCRAM). Intra-region (compute + DB
 *  co-located) a cold handshake is ~ms and 3s would suffice; kept at 10s as
 *  headroom so a region-away DATABASE_URL (cold handshake several seconds) still
 *  connects rather than 500ing. Bounds how long we WAIT, not how many slots we
 *  hold — no effect on the shared pool_size. */
const POOL_CONNECTION_TIMEOUT_MS_DEFAULT = 10_000;
/** Default idle timeout; override with DB_POOL_IDLE_TIMEOUT_MS. Keeps an idle
 *  backend this long so a burst (a click sequence, an action + its revalidate)
 *  reuses one warm connection. Lowered to 10s now that compute + DB are
 *  co-located (cheap reconnect ⇒ no reason to hoard idle slots against the
 *  shared pool); min:0 still drains fully between visits. */
const POOL_IDLE_TIMEOUT_MS_DEFAULT = 10_000;

/** Parse a positive-integer env value, falling back on missing/NaN/non-positive. */
function posIntEnv(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function tenantPoolMax(): number {
  return posIntEnv(process.env.DB_POOL_MAX_TENANT, TENANT_POOL_MAX_DEFAULT);
}

let pool: Pool | undefined;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for DHAGA_HOSTED_MODE (packages/ee needs real Postgres — PGlite has no RLS).",
    );
  }
  // Supabase's session pooler shares a fixed pool_size across ALL warm Vercel
  // instances (~48 = 80% of the instance's 60 max_connections; verify in the
  // Supabase dashboard). This tenant pool plus core's pool
  // (apps/web/src/lib/db/index.ts, default 2) is the per-instance draw, so keep
  // tenant + core small enough that several instances fit under it — default
  // 3 + 2 = 5/instance ⇒ ~9 warm instances. Do not raise blindly: one instance
  // hoarding the whole pool is the EMAXCONNSESSION outage this guards against.
  //
  // withConnectRetry patches this pool's connect()/query() so pool-bound
  // `drizzle(getPool())` control-plane reads (admin/repo.ts, access-requests,
  // billing, referrals, subscription-admin) ride out a momentary
  // EMAXCONNSESSION / connect-timeout instead of throwing — the explicit
  // tenant/admin acquire paths already retry via connectWithRetry. See
  // ./connect-retry.
  pool ??= withConnectRetry(
    new Pool({
      connectionString,
      max: tenantPoolMax(),
      // No warm floor: idle backends drain fully so this instance never holds a
      // tenant slot it isn't using against the shared pool.
      min: 0,
      connectionTimeoutMillis: posIntEnv(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, POOL_CONNECTION_TIMEOUT_MS_DEFAULT),
      idleTimeoutMillis: posIntEnv(process.env.DB_POOL_IDLE_TIMEOUT_MS, POOL_IDLE_TIMEOUT_MS_DEFAULT),
      // Longer-lived idle connections can be silently dropped by NAT/LB idle
      // reaping; keepAlive holds the socket open.
      keepAlive: true,
    }),
  );
  return pool;
}

/**
 * Return a tenant/admin-scoped client to the pool for REUSE rather than
 * destroying it. With a pool this small (default 3), destroying every
 * connection on release means a fresh TCP+TLS+auth handshake to the database on
 * essentially every request — costly on its own, and doubly so when the
 * database is a region away. Reuse removes that churn.
 *
 * Reuse safety now rests on TRANSACTION-scoping, not on a session reset. Every
 * scope sets its `app.*` GUC as a transaction-LOCAL setting
 * (`set_config(name, value, is_local => true)`, see tenant/scoped-db.ts and
 * admin-db.ts) inside a single BEGIN…COMMIT, so the setting is discarded the
 * instant that transaction ends — nothing can survive into the next checkout,
 * and there is nothing left to reset here. Deliberately NO `RESET ALL`:
 *   - it is unnecessary — the tenant/bypass GUC is already gone at
 *     COMMIT/ROLLBACK; and
 *   - it is UNSAFE under transaction-mode pooling — `RESET ALL` is a
 *     session-level command, and a transaction pooler (Supabase's port 6543,
 *     PgBouncer, Supavisor) routes a between-transactions statement to whatever
 *     backend it happens to grab, not the one the scope actually ran on.
 * Dropping it is exactly what lets this one release path run UNCHANGED on both
 * the session pooler (5432, today) and the transaction pooler (6543, at Pro
 * time): flipping pooler becomes a DATABASE_URL change, no code change.
 *
 * The scope ends its own transaction (COMMIT/ROLLBACK) before calling this — so
 * this only hands the physical connection back. Destroy-on-error fallback kept:
 * a client that won't release cleanly is discarded rather than reused dirty.
 */
export function releaseScoped(client: PoolClient): void {
  try {
    client.release();
  } catch {
    client.release(true);
  }
}
