import type { Pool } from "pg";
import { ddlAlreadyApplied, ddlFingerprint, recordDdlApplied } from "./ddl-history";
import { RLS_DDL } from "./rls-ddl";
import { EE_TABLES_DDL } from "./tables-ddl";

const EE_DDL = `${EE_TABLES_DDL}\n${RLS_DDL}`;

let applied: Promise<void> | undefined;

/**
 * Idempotent; safe to call on every cold start. Cached per process. The DDL
 * round-trip itself is skipped when this exact schema text was already
 * applied to this database (see ./ddl-history) — assertRoleRespectsRls is a
 * cheap fail-loud safety guard and still runs unconditionally on every cold
 * start regardless of the skip.
 *
 * No pooling-mode guard: tenant/admin scoping is TRANSACTION-scoped now (the
 * `app.*` GUCs are set transaction-local inside one BEGIN…COMMIT — see
 * tenant/scoped-db.ts, admin-db.ts, and pool.ts's releaseScoped), so BOTH
 * Postgres pooling modes are safe:
 *   - the SESSION pooler (Supabase port 5432 — today's DATABASE_URL), and
 *   - the TRANSACTION pooler (Supabase port 6543 — the Pro-tier target),
 *     PgBouncer/Supavisor, or Neon's `-pooler` endpoint.
 * A transaction-mode pooler re-assigns the backend between transactions, but
 * since every scope lives entirely inside one transaction that sets its own
 * GUC first, it is never run unscoped and never leaks across backends. Moving
 * from 5432 to 6543 is therefore a DATABASE_URL change with no code change —
 * which is why the earlier session-mode-only boot guard was removed.
 */
export function ensureEeSchema(pool: Pool): Promise<void> {
  applied ??= Promise.resolve()
    .then(async () => {
      const fingerprint = ddlFingerprint(EE_DDL);
      if (!(await ddlAlreadyApplied(pool, fingerprint))) {
        await pool.query(EE_DDL);
        await recordDdlApplied(pool, fingerprint);
      }
    })
    .then(() => assertRoleRespectsRls(pool));
  return applied;
}

/**
 * Every tenant-isolation guarantee here is Row-Level Security — a role that
 * ignores RLS ignores it entirely and silently, regardless of FORCE ROW LEVEL
 * SECURITY. Two role attributes do this: BYPASSRLS, and SUPERUSER (a superuser
 * bypasses RLS unconditionally even while rolbypassrls reads FALSE). Managed
 * Postgres providers' default admin role commonly has one or both out of the
 * box (Supabase's "postgres" role does); if DATABASE_URL connects as that
 * role, every tenant sees every other tenant's rows with no error at all. Fail
 * loud at boot instead — see scripts/create-app-role.sql for the role this
 * expects DATABASE_URL to use.
 */
async function assertRoleRespectsRls(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user",
  );
  if (rows[0]?.rolbypassrls || rows[0]?.rolsuper) {
    throw new Error(
      "DATABASE_URL connects as a Postgres role that bypasses RLS (BYPASSRLS or SUPERUSER) — " +
        "every tenant-isolation policy in this database is silently ignored for this role, so " +
        "every signed-in user can see every other user's data. Create a dedicated role with " +
        "neither attribute (run packages/ee/scripts/create-app-role.sql against this database) " +
        "and point DATABASE_URL at it instead.",
    );
  }
}
