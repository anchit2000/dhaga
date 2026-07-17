import { createHash } from "node:crypto";
import type { Pool } from "pg";

/**
 * Cold-start guard for the EE schema DDL — mirrors
 * apps/web/src/lib/db/ddl-history.ts. Deliberately duplicated rather than
 * imported: @dhaga/ee (PolyForm Shield) intentionally has no dependency on
 * the AGPL @dhaga/core or the app, so keep the two copies in sync by hand.
 * Both read/write the same ddl_history table, which is safe: rows are keyed
 * by content hash, the table create is IF NOT EXISTS, and the insert is ON
 * CONFLICT DO NOTHING, so core and EE fingerprints coexist as separate rows.
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
