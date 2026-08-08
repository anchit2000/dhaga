import { errorFields } from "@dhaga/core/src/logging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { processMessagingSession } from "@/lib/messaging";
import {
  MESSAGING_PROCESSING_STALL_MINUTES,
  MESSAGING_SESSION_IDLE_MINUTES,
} from "@/utils/constants/messaging";
import {
  claimInScope,
  hostedTenantIds,
  resolveSelfHostOwner,
  runOnGlobal,
  type ClaimedSession,
  type ScopedRunner,
} from "./claim";

/** How many batches this sweep processed, split by why each was picked up. */
export interface MessagingFlushSummary {
  /** Quiet batches auto-saved without the sender replying DONE. */
  flushed: number;
  /** Batches recovered from a `processing` state nothing else would retry. */
  resumed: number;
}

/**
 * The capture flow's safety net, run once a day from api/jobs/daily (and as
 * often as an instance likes via api/jobs/messaging/flush). It saves batches
 * their sender never closed, and — equally important — finishes batches a
 * previous run started and could not complete.
 *
 * Two steps, connection-hygiene-safe exactly like detect-signals:
 *   1. INSIDE a tenant scope, find and CLAIM the batches to work (./claim), so
 *      a concurrent sweep can't double-process one.
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
  const now = Date.now();
  const idleBefore = new Date(now - MESSAGING_SESSION_IDLE_MINUTES * 60_000);
  const stalledBefore = new Date(now - MESSAGING_PROCESSING_STALL_MINUTES * 60_000);
  const tenantIds = await hostedTenantIds();

  const claimed: ClaimedSession[] = [];
  let tenantsFailed = 0;
  let sessionsFailed = 0;
  let firstError: unknown;
  if (tenantIds === null) {
    // Self-host: one global sweep. resolveUserIdByIdentity is cross-tenant and
    // resolves the linked owner of each batch's chat.
    claimed.push(
      ...(await claimInScope({
        runScoped: runOnGlobal,
        idleBefore,
        stalledBefore,
        resolveOwner: resolveSelfHostOwner,
      })),
    );
  } else {
    // Hosted: each tenant's batches, claimed inside its own RLS scope. The owner
    // is the tenant we scoped into, so no routing-table lookup is needed.
    for (const userId of tenantIds) {
      try {
        const runScoped: ScopedRunner = (work) => withUserDb(userId, work);
        claimed.push(
          ...(await claimInScope({
            runScoped,
            idleBefore,
            stalledBefore,
            resolveOwner: () => Promise.resolve(userId),
          })),
        );
      } catch (error) {
        // Isolate the tenant: one user's claim failing must not abort the rest.
        // Counted for the aggregate line below — the summary only ever grows on
        // success, so a tenant that never got claimed leaves no trace in it.
        tenantsFailed += 1;
        firstError ??= error;
        logActionError("messaging_flush", error);
      }
    }
  }

  const summary: MessagingFlushSummary = { flushed: 0, resumed: 0 };
  for (const { userId, session, reason } of claimed) {
    try {
      await processMessagingSession(userId, session);
      if (reason === "idle") summary.flushed += 1;
      else summary.resumed += 1;
    } catch (error) {
      // Isolate the batch: one failing session must not abort the sweep. Never
      // logs the error body (could echo forwarded third-party PII, privacy rule).
      sessionsFailed += 1;
      firstError ??= error;
      logActionError("messaging_flush", error);
    }
  }

  if (tenantsFailed > 0 || sessionsFailed > 0) {
    // The denominators the per-item lines above don't carry. `flushed` and
    // `resumed` only ever count successes, so a night where every claimed batch
    // blew up returns the same {0,0} as a night with nothing to flush — and a
    // capture batch that never flushes is a message the user believes was saved.
    // Read it as: sessionsFailed === claimed means the processing path itself is
    // down (LLM key/cap, DB) and NOTHING was saved tonight, while the batches
    // stay claimed in `processing` until the stall window re-picks them;
    // tenantsFailed === tenantsTotal means claiming never ran, so nothing was
    // even looked at. Counts only — no tenant ids, chat ids or message text.
    console.error("[job:messaging-flush] batches failed", {
      tenantsTotal: tenantIds?.length ?? 1,
      tenantsFailed,
      claimed: claimed.length,
      sessionsFailed,
      ...errorFields(firstError),
    });
  }
  return summary;
}
