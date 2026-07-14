import type { Pool } from "pg";
import { RLS_DDL } from "./rls-ddl";
import { EE_TABLES_DDL } from "./tables-ddl";

let applied: Promise<void> | undefined;

/** Idempotent; safe to call on every cold start. Cached per process. */
export function ensureEeSchema(pool: Pool): Promise<void> {
  applied ??= pool.query(`${EE_TABLES_DDL}\n${RLS_DDL}`).then(() => assertRoleRespectsRls(pool));
  return applied;
}

/**
 * Every tenant-isolation guarantee here is Row-Level Security — a role with
 * BYPASSRLS ignores it entirely and silently, regardless of FORCE ROW LEVEL
 * SECURITY. Managed Postgres providers' default admin role commonly has
 * BYPASSRLS out of the box (Supabase's "postgres" role does); if
 * DATABASE_URL connects as that role, every tenant sees every other
 * tenant's rows with no error at all. Fail loud at boot instead — see
 * scripts/create-app-role.sql for the role this expects DATABASE_URL to use.
 */
async function assertRoleRespectsRls(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ rolbypassrls: boolean }>(
    "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user",
  );
  if (rows[0]?.rolbypassrls) {
    throw new Error(
      "DATABASE_URL connects as a Postgres role with BYPASSRLS set — every tenant-isolation " +
        "policy in this database is silently ignored for this role, so every signed-in user " +
        "can see every other user's data. Create a dedicated role without BYPASSRLS (run " +
        "packages/ee/scripts/create-app-role.sql against this database) and point " +
        "DATABASE_URL at it instead.",
    );
  }
}
