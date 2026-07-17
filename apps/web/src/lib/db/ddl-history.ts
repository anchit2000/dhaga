import { createHash } from "node:crypto";
import type { Pool } from "pg";

/**
 * Cold-start guard for the hosted-Postgres schema: executing the full
 * idempotent DDL script is a multi-second round trip against a remote
 * database, and initHosted runs it on every serverless cold start. Applied
 * DDL is recorded here by content hash, so the script only re-executes when
 * its text actually changes. Deleting a row from ddl_history forces a
 * re-run (e.g. after manual schema surgery the idempotent DDL should heal).
 */
const DDL_HISTORY_TABLE = `CREATE TABLE IF NOT EXISTS ddl_history (
  hash text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

export function ddlFingerprint(ddl: string): string {
  return createHash("sha256").update(ddl).digest("hex");
}

/**
 * True when this exact DDL text is already recorded as applied. A missing
 * ddl_history table (fresh database) reads as "not applied" — the caller
 * then runs the DDL, and recordDdlApplied creates the table.
 */
export async function ddlAlreadyApplied(pool: Pool, fingerprint: string): Promise<boolean> {
  try {
    const { rowCount } = await pool.query("SELECT 1 FROM ddl_history WHERE hash = $1", [fingerprint]);
    return (rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function recordDdlApplied(pool: Pool, fingerprint: string): Promise<void> {
  await pool.query(DDL_HISTORY_TABLE);
  await pool.query("INSERT INTO ddl_history (hash) VALUES ($1) ON CONFLICT (hash) DO NOTHING", [fingerprint]);
}
