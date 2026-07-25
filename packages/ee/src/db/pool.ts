import { Pool } from "pg";
import type { PoolClient } from "pg";

/**
 * EE connects to the exact same Postgres database as core (same tables) —
 * RLS is what separates tenants, not a different connection target. A
 * separate pool from core's own (apps/web/src/lib/db/index.ts) so tenant-
 * scoped connections never contend with or get confused for core's plain
 * global connection.
 */

/** Default max for this tenant pool; override with DB_POOL_MAX_TENANT. */
const TENANT_POOL_MAX_DEFAULT = 3;
/** Reject an acquire after this long. node-postgres counts the FULL acquisition
 *  here — including establishing a brand-new physical connection (TCP+TLS+SCRAM).
 *  Against a region-away pooler (e.g. Supabase Sydney from a US function) a COLD
 *  handshake alone is ~6–7s, so the old 3s guaranteed a "timeout exceeded when
 *  trying to connect" on every cold connect — the /app 500s. 10s covers the
 *  cross-region cold handshake with margin while still eventually failing a dead
 *  pool. It bounds how long we WAIT, not how many slots we hold, so it has zero
 *  effect on the shared pool_size of 15. */
const POOL_CONNECTION_TIMEOUT_MS = 10_000;
/** Keep an idle backend around this long so a burst of requests (a user's click
 *  sequence, an action + its revalidate) reuses ONE warm connection instead of
 *  re-paying the multi-second cross-region cold handshake each time. 2s was
 *  pathological for a region-away DB — the warm window closed between clicks.
 *  30s still drains fully between visits (min:0), so a warm instance is not
 *  permanently hoarding a slot against the shared 15. */
const POOL_IDLE_TIMEOUT_MS = 30_000;

/** Parse a positive-integer pool size from env, falling back on missing/NaN. */
function tenantPoolMax(): number {
  const value = Number(process.env.DB_POOL_MAX_TENANT);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : TENANT_POOL_MAX_DEFAULT;
}

let pool: Pool | undefined;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for DHAGA_HOSTED_MODE (packages/ee needs real Postgres — PGlite has no RLS).",
    );
  }
  // Supabase's session pooler shares a fixed pool_size of 15 backends across
  // ALL warm Vercel instances. This tenant pool plus core's pool
  // (apps/web/src/lib/db/index.ts, default 2) is the per-instance draw, so keep
  // tenant + core small enough that several instances fit under 15 — default
  // 3 + 2 = 5/instance. Do not raise blindly: one instance hoarding all 15 is
  // the EMAXCONNSESSION outage this guards against.
  pool ??= new Pool({
    connectionString,
    max: tenantPoolMax(),
    // No warm floor: idle backends drain fully so this instance never holds a
    // tenant slot it isn't using against the shared pool_size of 15.
    min: 0,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    // Longer-lived idle connections (idleTimeoutMillis above) can be silently
    // dropped by NAT/load-balancer idle reaping; keepAlive holds the socket open.
    keepAlive: true,
  });
  return pool;
}

/**
 * Return a tenant/admin-scoped client to the pool CLEAN so it can be reused
 * rather than destroyed. With a pool this small (default 3), destroying every
 * connection on release means a fresh TCP+TLS+auth handshake to the database on
 * essentially every request — costly on its own, and doubly so when the
 * database is a region away. Reuse removes that churn.
 *
 * The catch is safety: the session-level `app.*` GUCs set for tenant scoping
 * (`app.current_user_id`, see tenant/scoped-db.ts) and admin bypass
 * (`app.bypass_rls`, see admin-db.ts) MUST NOT survive into the next checkout —
 * a stale setting on a reused connection is a cross-tenant data leak, not a
 * crash. `RESET ALL` clears every customized session setting regardless of
 * which path set it, so a backend previously used by openAdminConnection can
 * never leak `app.bypass_rls` into a tenant checkout (or vice versa). This is
 * sound only under session-mode pooling — one backend pinned per client for the
 * life of the checkout — which bootstrap.ts already enforces (port 5432, never
 * 6543). The client is not handed back to the pool until the reset resolves; if
 * the reset fails, the connection is destroyed rather than reused dirty. Await
 * it where the reset must complete before the function may suspend (see
 * request-scope.ts / admin/usage.ts).
 */
export async function releaseScoped(client: PoolClient): Promise<void> {
  try {
    await client.query("RESET ALL");
    client.release();
  } catch {
    client.release(true);
  }
}
