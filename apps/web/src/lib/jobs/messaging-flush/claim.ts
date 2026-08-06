import { getDb as getGlobalDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema";
import { getTenantGate } from "@/lib/hosted/gate";
import {
  findIdleOpenSessions,
  findStalledProcessingSessions,
  resolveUserIdByIdentity,
  setSessionStatus,
  type SweepableSession,
} from "@/lib/repo/messaging";

/** One batch claimed for processing, tagged with the Dhaga user that owns it. */
export interface ClaimedSession {
  userId: string;
  session: SweepableSession;
  /** Why it was picked up — reported separately so an operator can see whether
   *  batches are merely quiet or are actually failing to finish. */
  reason: "idle" | "stalled";
}

/** A batch's (provider, externalId) — enough to route it to its owner. */
export type SessionRef = { provider: string; externalId: string };

/**
 * Runs one DB-only unit of work in the caller's tenant scope. Mirrors
 * detect-signals' ScopedRunner: in hosted mode it is `withUserDb(userId, …)` (a
 * single short RLS-scoped transaction); in self-host it is a passthrough onto
 * the plain global connection. DB work goes INSIDE it; the sweep's LLM/network
 * calls stay BETWEEN units, so no connection is held across network I/O.
 */
export type ScopedRunner = <T>(work: () => Promise<T>) => Promise<T>;

/** Self-host runner: no tenant gate, so DB work runs on the plain global connection. */
export const runOnGlobal: ScopedRunner = (work) => work();

/** Not a real tenant — only asks the gate whether it scopes at all (see detect-signals). */
const TENANT_MODE_PROBE_ID = "__messaging-flush-mode-probe__";

/**
 * INSIDE one scope: find every batch this sweep owes work to, resolve its owner,
 * and claim it (status → "processing"). Two sources, and the second is the one
 * that makes the flow self-healing:
 *
 *   - IDLE open batches — quiet long enough to auto-save without a DONE; and
 *   - STALLED processing batches — a run that was killed mid-walk, or one too
 *     big to finish in a single run. Nothing else would ever retry these, so
 *     without this a sender is told "processing…" and then never hears back.
 *
 * Re-claiming a stalled batch is safe because the walk resumes from unprocessed
 * items only. A batch whose owner can't be resolved is left alone rather than
 * processed against no user. The whole find+claim runs in a single scoped unit
 * so the claim is consistent; processing happens later, outside the scope.
 */
export async function claimInScope(input: {
  runScoped: ScopedRunner;
  idleBefore: Date;
  stalledBefore: Date;
  resolveOwner: (session: SessionRef) => Promise<string | null>;
}): Promise<ClaimedSession[]> {
  const { runScoped, idleBefore, stalledBefore, resolveOwner } = input;
  return runScoped(async () => {
    const sources: Array<{ reason: ClaimedSession["reason"]; sessions: SweepableSession[] }> = [
      { reason: "idle", sessions: await findIdleOpenSessions(idleBefore) },
      { reason: "stalled", sessions: await findStalledProcessingSessions(stalledBefore) },
    ];
    const claimed: ClaimedSession[] = [];
    for (const { reason, sessions } of sources) {
      for (const session of sessions) {
        const userId = await resolveOwner(session);
        if (!userId) continue;
        // Re-stamping a stalled batch's status bumps updated_at, which is what
        // stops the NEXT sweep from claiming a batch this one is still working.
        await setSessionStatus({ sessionId: session.id, status: "processing" });
        claimed.push({ userId, session, reason });
      }
    }
    return claimed;
  });
}

/** Self-host owner of a batch: the user its chat is linked to (routing table). */
export function resolveSelfHostOwner(session: SessionRef): Promise<string | null> {
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
export async function hostedTenantIds(): Promise<string[] | null> {
  const probe = await (await getTenantGate()).scopedDb(TENANT_MODE_PROBE_ID);
  if (!probe) return null;
  // The probe only answers "does the gate scope?" — it opened no transaction and
  // set no tenant GUC, so hand its connection straight back to the pool.
  await probe.release();

  const db = await getGlobalDb();
  const rows = await db.select({ id: authUser.id }).from(authUser);
  return rows.map((row) => row.id);
}
