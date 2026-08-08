import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { hostedTenants, runOnGlobal, type ScopedRunner } from "@/lib/hosted/tenants";

/**
 * The multi-tenant fan-out every nightly job shares: decide the instance's mode
 * (hosted RLS vs self-host), and — when hosted — run one sweep per tenant inside
 * its own `withUserDb` scope with per-tenant error isolation.
 *
 * Rule 3 (don't touch adjacent code) and CLAUDE.md's "No Duplicate Code"
 * genuinely pull against each other here, and duplication loses: this loop had
 * already been hand-copied into `detect-signals` and `messaging-flush` beside
 * the shared `lib/hosted/tenants.ts` enumeration, and a mistake in a hand-copied
 * tenancy loop is a cross-tenant data leak, not a style nit. Folding the signals
 * sweep onto `hostedTenants()` is also the cleanup docs/FOLLOW_UPS.md asks for.
 *
 * Mode and the tenant list both come from `lib/hosted/tenants.ts`, which probes
 * the tenant gate and enumerates the core (non-RLS) auth `user` table over the
 * plain global connection — so it sees every tenant without ever bypassing RLS
 * on a tenant table.
 */
export { runOnGlobal, type ScopedRunner };

/**
 * All tenant ids to sweep in hosted mode, or `null` when this instance is
 * self-host / core-only (the caller then runs ONE unscoped pass via
 * `runOnGlobal` — with no gate, looping users would repeat the same global work
 * once per user). Id-only view of `hostedTenants()`, for jobs that have no email
 * to send and so need nothing but the scope key.
 */
export async function hostedTenantIds(): Promise<string[] | null> {
  const tenants = await hostedTenants();
  return tenants?.map((tenant) => tenant.id) ?? null;
}

/**
 * Hosted fan-out: run `sweep` once per tenant, each inside that tenant's RLS
 * scope, and return the results of the tenants that finished. One tenant failing
 * must never abort the rest (best-effort), so a throw is logged under `label`
 * and that tenant is simply retried on the next run. `logActionError` records
 * only { code, name, transient } — never the error body, which could echo
 * contact-derived text (privacy rule).
 *
 * Sequential on purpose: each tenant checks out a connection from the small
 * tenant pool, and the callers' sweeps make network calls between scoped units.
 *
 * The failure COUNT is logged once at the end because the return value can't
 * carry it: callers sum the summaries that came back, so a sweep where every
 * tenant threw sums to exactly the same zeros as a quiet night with no work due
 * (see the log's own comment for how to read it).
 */
export async function forEachTenant<T>(
  tenantIds: readonly string[],
  label: string,
  sweep: (runScoped: ScopedRunner, userId: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = [];
  let tenantsFailed = 0;
  for (const userId of tenantIds) {
    try {
      results.push(await sweep((work) => withUserDb(userId, work), userId));
    } catch (error) {
      tenantsFailed += 1;
      logActionError(label, error);
    }
  }
  // The denominator the per-tenant lines above don't have. Read it as:
  // tenantsFailed === tenantsTotal means the sweep is systemically broken (bad
  // key, schema drift, pool exhausted) and NO tenant was swept tonight — the
  // job's summary will still be all zeros, which is why this line exists; a
  // small fraction means ordinary per-tenant trouble that the next run retries.
  // Counts only, never tenant ids or emails (privacy rule).
  if (tenantsFailed > 0) {
    console.error("[job:tenant-sweep] tenants failed", {
      label,
      tenantsTotal: tenantIds.length,
      tenantsFailed,
    });
  }
  return results;
}
