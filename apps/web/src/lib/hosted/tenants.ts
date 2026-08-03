import { getDb as getGlobalDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema";
import { getTenantGate } from "@/lib/hosted/gate";

/**
 * Runs one DB-only unit of work in a tenant scope (hosted) or straight on the
 * plain global connection (self-host). Keep only DB work inside it — never hold
 * it across network I/O (connection hygiene, mirroring the detect-signals sweep).
 */
export type ScopedRunner = <T>(work: () => Promise<T>) => Promise<T>;

/** Self-host runner: no tenant gate, so DB work runs on the global connection. */
export const runOnGlobal: ScopedRunner = (work) => work();

/** Not a real tenant — only used to ask the gate whether it scopes at all. */
const TENANT_MODE_PROBE_ID = "__tenant-mode-probe__";

/**
 * Every tenant (id + account email) a per-user background job must fan out to
 * in hosted mode, or `null` when this instance is self-host / core-only (a
 * single global pass is correct — the gate scopes nothing). The user list comes
 * from the core (non-RLS) auth `user` table over the plain global connection,
 * so it can enumerate every tenant without an RLS bypass on the tenant tables.
 *
 * Jobs that need ids only (no email to send) go through lib/jobs/tenant-sweep's
 * `hostedTenantIds()`, which wraps this — detect-signals included. One private
 * copy is still outstanding in lib/jobs/messaging-flush (docs/FOLLOW_UPS.md).
 */
export async function hostedTenants(): Promise<{ id: string; email: string }[] | null> {
  const probe = await (await getTenantGate()).scopedDb(TENANT_MODE_PROBE_ID);
  if (!probe) return null;
  // The probe only answers "does the gate scope?" — it opened no transaction and
  // set no tenant GUC, so hand its connection straight back to the pool.
  await probe.release();

  const db = await getGlobalDb();
  const rows = await db.select({ id: authUser.id, email: authUser.email }).from(authUser);
  return rows;
}
