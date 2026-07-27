import { getDb as getGlobalDb } from "@/lib/db";
import { withUserDb } from "@/lib/db/request-scope";
import { authUser } from "@/lib/db/schema";
import { getTenantGate } from "@/lib/hosted/gate";
import { logActionError } from "@/lib/actions/resilience";
import { processMessagingSession } from "@/lib/messaging";
import { findIdleOpenSessions, resolveUserIdByIdentity, setSessionStatus } from "@/lib/repo/messaging";
import { MESSAGING_SESSION_IDLE_MINUTES } from "@/utils/constants/messaging";

/** How many idle batches this sweep processed to completion. */
export interface MessagingFlushSummary {
  flushed: number;
}

/** One idle batch claimed for processing, tagged with the Dhaga user that owns it. */
interface ClaimedSession {
  userId: string;
  session: { id: string; provider: string; externalId: string };
}

/** A batch's (provider, externalId) — enough to route it to its owner. */
type SessionRef = { provider: string; externalId: string };

/**
 * Runs one DB-only unit of work in the caller's tenant scope. Mirrors
 * detect-signals' ScopedRunner: in hosted mode it is `withUserDb(userId, …)` (a
 * single short RLS-scoped transaction); in self-host it is a passthrough onto
 * the plain global connection. DB work goes INSIDE it; the sweep's LLM/network
 * calls stay BETWEEN units, so no connection is held across network I/O.
 */
type ScopedRunner = <T>(work: () => Promise<T>) => Promise<T>;

/** Self-host runner: no tenant gate, so DB work runs on the plain global connection. */
const runOnGlobal: ScopedRunner = (work) => work();

/** Not a real tenant — only asks the gate whether it scopes at all (see detect-signals). */
const TENANT_MODE_PROBE_ID = "__messaging-flush-mode-probe__";

/**
 * Idle-session auto-flush: any open batch with no activity for
 * MESSAGING_SESSION_IDLE_MINUTES is saved without the sender having to reply
 * DONE. This is the "auto-save after idle" half of the capture flow.
 *
 * Two steps, connection-hygiene-safe exactly like detect-signals:
 *   1. INSIDE a tenant scope, find idle open batches and CLAIM each one
 *      (status → "processing") so a concurrent sweep can't double-process it.
 *   2. OUTSIDE the scope, hand each claimed batch to processMessagingSession —
 *      which does its own DB scoping AND the batch's positional LLM processing,
 *      so no DB connection is ever held across that network I/O.
 *
 * Tenant scoping mirrors detect-signals exactly: self-host (no tenant gate) is
 * one global sweep; hosted (RLS on) loops tenants enumerated from the core
 * (non-RLS) auth `user` table, each inside withUserDb. In hosted mode the owner
 * IS the tenant we scoped into; in self-host the owner is recovered from the
 * (provider, external_id) routing table — the same mapping the inbound webhook
 * uses. One bad session (or one bad tenant) is logged and skipped, never
 * aborting the sweep.
 */
export async function runMessagingFlush(): Promise<MessagingFlushSummary> {
  const idleBefore = new Date(Date.now() - MESSAGING_SESSION_IDLE_MINUTES * 60_000);
  const tenantIds = await hostedTenantIds();

  const claimed: ClaimedSession[] = [];
  if (tenantIds === null) {
    // Self-host: one global sweep. resolveUserIdByIdentity is cross-tenant and
    // resolves the linked owner of each batch's chat.
    claimed.push(...(await claimInScope(runOnGlobal, idleBefore, resolveSelfHostOwner)));
  } else {
    // Hosted: each tenant's idle batches, claimed inside its own RLS scope. The
    // owner is the tenant we scoped into, so no routing-table lookup is needed.
    for (const userId of tenantIds) {
      try {
        const runScoped: ScopedRunner = (work) => withUserDb(userId, work);
        claimed.push(...(await claimInScope(runScoped, idleBefore, () => Promise.resolve(userId))));
      } catch (error) {
        // Isolate the tenant: one user's claim failing must not abort the rest.
        logActionError("messaging_flush", error);
      }
    }
  }

  let flushed = 0;
  for (const { userId, session } of claimed) {
    try {
      await processMessagingSession(userId, session);
      flushed += 1;
    } catch (error) {
      // Isolate the batch: one failing session must not abort the sweep. Never
      // logs the error body (could echo forwarded third-party PII, privacy rule).
      logActionError("messaging_flush", error);
    }
  }
  return { flushed };
}

/**
 * INSIDE one scope: find every idle open batch, resolve its owner, and claim it
 * (status → "processing"). A batch whose owner can't be resolved is left open
 * (skipped) rather than processed against no user. The whole find+claim runs in
 * a single scoped unit so the claim is consistent; processing happens later,
 * outside the scope.
 */
async function claimInScope(
  runScoped: ScopedRunner,
  idleBefore: Date,
  resolveOwner: (session: SessionRef) => Promise<string | null>,
): Promise<ClaimedSession[]> {
  return runScoped(async () => {
    const idle = await findIdleOpenSessions(idleBefore);
    const claimed: ClaimedSession[] = [];
    for (const session of idle) {
      const userId = await resolveOwner(session);
      if (!userId) continue;
      await setSessionStatus({ sessionId: session.id, status: "processing" });
      claimed.push({ userId, session });
    }
    return claimed;
  });
}

/** Self-host owner of a batch: the user its chat is linked to (routing table). */
function resolveSelfHostOwner(session: SessionRef): Promise<string | null> {
  return resolveUserIdByIdentity(session.provider, session.externalId);
}

/**
 * All tenant ids to sweep in hosted mode, or `null` when this instance is
 * self-host / core-only. Identical mechanism to detect-signals' hostedTenantIds:
 * probe the tenant gate (scopedDb returns null in core-only mode, a real scoped
 * connection under EE's RLS); the user list itself comes from the core (non-RLS)
 * auth `user` table over the plain global connection, so it sees every tenant
 * without an RLS bypass on the tenant tables.
 */
async function hostedTenantIds(): Promise<string[] | null> {
  const probe = await (await getTenantGate()).scopedDb(TENANT_MODE_PROBE_ID);
  if (!probe) return null;
  // The probe only answers "does the gate scope?" — it opened no transaction and
  // set no tenant GUC, so hand its connection straight back to the pool.
  await probe.release();

  const db = await getGlobalDb();
  const rows = await db.select({ id: authUser.id }).from(authUser);
  return rows.map((row) => row.id);
}
