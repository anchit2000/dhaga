import { Pool } from "pg";

/**
 * EE connects to the exact same Postgres database as core (same tables) —
 * RLS is what separates tenants, not a different connection target. A
 * separate pool from core's own (apps/web/src/lib/db/index.ts) so tenant-
 * scoped connections never contend with or get confused for core's plain
 * global connection.
 */

/** Default max for this tenant pool; override with DB_POOL_MAX_TENANT. */
const TENANT_POOL_MAX_DEFAULT = 3;
/** Fail fast on a saturated pool instead of hanging forever. */
const POOL_CONNECTION_TIMEOUT_MS = 10_000;
/** Close idle backends quickly so a warm instance stops hoarding slots. */
const POOL_IDLE_TIMEOUT_MS = 10_000;

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
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
  });
  return pool;
}
