import type { Pool } from "pg";
import { ddlAlreadyApplied, ddlFingerprint, recordDdlApplied } from "./ddl-history";
import { RLS_DDL } from "./rls-ddl";
import { EE_TABLES_DDL } from "./tables-ddl";

const EE_DDL = `${EE_TABLES_DDL}\n${RLS_DDL}`;

let applied: Promise<void> | undefined;

/**
 * Idempotent; safe to call on every cold start. Cached per process. The DDL
 * round-trip itself is skipped when this exact schema text was already
 * applied to this database (see ./ddl-history) — assertSessionScopedPooling
 * and assertRoleRespectsRls are cheap fail-loud safety guards and still run
 * unconditionally on every cold start regardless of the skip.
 */
export function ensureEeSchema(pool: Pool): Promise<void> {
  applied ??= Promise.resolve()
    .then(() => assertSessionScopedPooling(process.env.DATABASE_URL))
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
 * Tenant scoping rides on session-level `set_config('app.current_user_id', …)`
 * on a dedicated client (see tenant/scoped-db.ts). Transaction-mode pooling
 * (Supabase's Supavisor on port 6543, PgBouncer, Supavisor, Neon's `-pooler`
 * endpoint, …) re-assigns the server backend between queries on that same
 * client, which breaks the scoping in both directions: queries intermittently
 * run unscoped (RLS returns zero rows), and the setting can persist on a
 * backend later handed to a different client — a cross-tenant exposure, not a
 * crash. A direct connection, or a session-mode pooler (Supabase's same host
 * on port 5432), pins one backend per client and is safe.
 *
 * Detection is a heuristic over the connection string: Supabase's pooler host
 * on port 6543, any hostname containing `pooler` or `pgbouncer`, or a
 * `pgbouncer=true` query flag. Because a legitimately session-mode pooler can
 * match these signatures (e.g. Supabase's session pooler shares the `pooler`
 * host, distinguished only by port), setting `DHAGA_ALLOW_TRANSACTION_POOLER=true`
 * downgrades the fail-loud throw to a one-time warning for operators who have
 * confirmed their pooler is session-scoped. Fail loud at boot by default, like
 * assertRoleRespectsRls below.
 */
let transactionPoolerWarned = false;

export function assertSessionScopedPooling(connectionString: string | undefined): void {
  if (!connectionString) return;
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return; // non-URL connection formats can't be checked here
  }
  const host = url.hostname.toLowerCase();
  const query = url.search.toLowerCase();
  const isSupabasePoolerHost = host === "pooler.supabase.com" || host.endsWith(".pooler.supabase.com");
  if (isSupabasePoolerHost) {
    // Supabase serves both modes from the same host, distinguished only by
    // port: 6543 = transaction pooler (unsafe), 5432 = session pooler (safe).
    if (url.port !== "6543") return;
  } else {
    const looksLikeTransactionPooler =
      host.includes("pooler") || host.includes("pgbouncer") || query.includes("pgbouncer=true");
    if (!looksLikeTransactionPooler) return;
  }

  const message =
    "DATABASE_URL looks like a transaction-mode connection pooler (matched Supabase's port 6543, " +
    "a `pooler`/`pgbouncer` hostname, or a `pgbouncer=true` flag). Tenant scoping uses " +
    "session-level set_config, which transaction pooling silently breaks — queries intermittently " +
    "run unscoped (RLS returns no rows) and the tenant setting can leak across pooled backends. " +
    "Point DATABASE_URL at a direct connection or a session-mode pooler (Supabase: same host, " +
    "port 5432) instead. If this pooler is genuinely session-scoped and the heuristic is a false " +
    "positive, set DHAGA_ALLOW_TRANSACTION_POOLER=true to downgrade this to a warning.";

  if (process.env.DHAGA_ALLOW_TRANSACTION_POOLER === "true") {
    if (!transactionPoolerWarned) {
      transactionPoolerWarned = true;
      console.warn(`[dhaga] ${message}`);
    }
    return;
  }
  throw new Error(message);
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
