import { Pool } from "pg";

/**
 * EE connects to the exact same Postgres database as core (same tables) —
 * RLS is what separates tenants, not a different connection target. A
 * separate pool from core's own (apps/web/src/lib/db/index.ts) so tenant-
 * scoped connections never contend with or get confused for core's plain
 * global connection.
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for DHAGA_HOSTED_MODE (packages/ee needs real Postgres — PGlite has no RLS).",
    );
  }
  pool ??= new Pool({ connectionString, max: 10 });
  return pool;
}
