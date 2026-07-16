import type { Pool } from "pg";
import { RLS_DDL } from "./rls-ddl";
import { EE_TABLES_DDL } from "./tables-ddl";

let applied: Promise<void> | undefined;

/** Idempotent; safe to call on every cold start. Cached per process. */
export function ensureEeSchema(pool: Pool): Promise<void> {
  applied ??= Promise.resolve()
    .then(() => assertSessionScopedPooling(process.env.DATABASE_URL))
    .then(() => pool.query(`${EE_TABLES_DDL}\n${RLS_DDL}`))
    .then(() => assertRoleRespectsRls(pool));
  return applied;
}

/**
 * Tenant scoping rides on session-level `set_config('app.current_user_id', …)`
 * on a dedicated client (see tenant/scoped-db.ts). Transaction-mode pooling
 * (Supabase's Supavisor on port 6543) re-assigns the server backend between
 * queries on that same client, which breaks the scoping in both directions:
 * queries intermittently run unscoped (RLS returns zero rows), and the
 * setting can persist on a backend later handed to a different client — a
 * cross-tenant exposure, not a crash. The session pooler (same host, port
 * 5432) or a direct connection pins one backend per client and is safe.
 * Fail loud at boot, like assertRoleRespectsRls below.
 */
function assertSessionScopedPooling(connectionString: string | undefined): void {
  if (!connectionString) return;
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return; // non-URL connection formats can't be checked here
  }
  if (url.hostname.endsWith("pooler.supabase.com") && url.port === "6543") {
    throw new Error(
      "DATABASE_URL points at Supabase's transaction-mode pooler (port 6543). Tenant scoping " +
        "uses session-level set_config, which transaction pooling silently breaks — queries " +
        "intermittently run unscoped (RLS returns no rows) and the tenant setting can leak " +
        "across pooled backends. Point DATABASE_URL at the session pooler (same host, port " +
        "5432) or a direct connection instead.",
    );
  }
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
