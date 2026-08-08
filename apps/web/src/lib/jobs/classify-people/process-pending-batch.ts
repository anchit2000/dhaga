import { and, eq, ne } from "drizzle-orm";
import { personClassificationSchema, type BatchLLMClient } from "@dhaga/core";
import { errorFields, providerStatus } from "@dhaga/core/src/logging";
import { recordAiAction } from "@/lib/ai/metering";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { PERSON_CLASSIFICATION_BATCH_KEY, setPendingBatchId } from "@/lib/repo/settings";
import { PERSON_KIND_BY } from "@/utils/constants/person-kind";
import type { ScopedRunner } from "@/lib/jobs/tenant-sweep";

export type PendingBatchOutcome = { done: false } | { done: true; classified: number };

/**
 * Phase 1: if the batch submitted on an earlier run has finished, write its
 * verdicts. Status and result fetches run OUTSIDE `runScoped` so no tenant
 * connection is held across the network; the whole application (metering +
 * updates + clearing the pointer) is one scoped, DB-only unit.
 *
 * THE USER LOCK IS RE-CHECKED AT WRITE TIME, not just at submit time. A batch
 * lives up to 24h, and in that window the user can open the contact and rule on
 * it themselves — applying a stale model verdict would silently revert their
 * correction, the exact failure person_kind_by exists to prevent. The re-check
 * is a clause in the UPDATE's WHERE rather than a read-then-write in TypeScript
 * so it is not possible to forget: a locked row matches zero rows and the update
 * is a no-op, with no branch to get wrong and no read/write race in between.
 *
 * `person_kind_by` is left at its 'model' default — the WHERE already
 * guarantees the row is not user-owned, and the column has no third value.
 *
 * Metered as `person_classification`, a feature of its own rather than folded
 * into the goal pass, so an operator debugging cost can tell which nightly pass
 * burned what. Priced at 0 credits, but the token counts are real.
 */
export async function processPendingBatch(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
  batchId: string,
): Promise<PendingBatchOutcome> {
  let isDone: boolean;
  try {
    isDone = await batchClient.isBatchDone(batchId);
  } catch (error) {
    // Transient failure checking status — retry next run rather than discard a
    // batch id we can't yet confirm has finished. "Transient" is an ASSUMPTION
    // though: when it's wrong this returns {done:false} every night forever and
    // the classification pass quietly stops. `status` decides which — 429/5xx is
    // genuinely transient, while 404 (batch id aged out) or 401/403 (key
    // revoked) is permanent and the pointer has to be cleared by hand before a
    // fresh batch can be submitted. The same line every night means permanent
    // whatever the status says.
    console.error("[job:classify-people] batch poll failed", {
      phase: "status",
      status: providerStatus(error),
      ...errorFields(error),
    });
    return { done: false };
  }
  if (!isDone) return { done: false };

  try {
    const results = await batchClient.getBatchResults(batchId, personClassificationSchema);
    const classified = await runScoped(async () => {
      const db = await getDb();
      let count = 0;
      let applyFailures = 0;
      let firstApplyError: unknown;
      for (const result of results) {
        if (result.status !== "succeeded" || !result.data || !result.model || !result.usage) {
          // errored/expired/canceled — Anthropic doesn't bill these, and the
          // contact simply stays judged-but-unlabelled until it is due again.
          continue;
        }
        try {
          // Message Batches API — half price both directions. Recorded so the
          // dollar gate prices it correctly (this feature costs 0 credits, so
          // dollars are the only ceiling that sees it at all).
          await recordAiAction("person_classification", result.model, result.usage, {
            batch: true,
          });
          const updated = await db
            .update(contacts)
            .set({
              personKind: result.data.kind,
              personKindConfidence: result.data.confidence,
            })
            .where(
              and(
                eq(contacts.id, result.id),
                // The lock. See the docblock: a user ruling made while this
                // batch was in flight must win.
                ne(contacts.personKindBy, PERSON_KIND_BY[1]),
              ),
            )
            .returning({ id: contacts.id });
          count += updated.length;
        } catch (error) {
          // One contact's verdict failing to apply must never abort the rest of
          // the batch (best-effort, as in detect-signals) — counted, not just
          // swallowed, because the pointer is cleared below either way.
          applyFailures += 1;
          firstApplyError ??= error;
        }
      }
      if (applyFailures > 0) {
        // The pending pointer is cleared unconditionally two lines down, so a
        // batch we already paid for is discarded whether or not it applied.
        // Read it as: applyFailures === resultCount means the WHOLE night's
        // verdicts were thrown away — classified is 0, nothing retries them,
        // and the cause is systemic (schema drift on contacts, RLS/pool
        // failure, the dollar gate rejecting every recordAiAction), not one odd
        // contact. Note `classified` alone can legitimately be 0 with no
        // failures at all: the user-lock WHERE no-ops rows the user has ruled
        // on, which is why the count needs its own line to be readable.
        console.error("[job:classify-people] batch results failed to apply", {
          resultCount: results.length,
          applyFailures,
          ...errorFields(firstApplyError),
        });
      }
      await setPendingBatchId(PERSON_CLASSIFICATION_BATCH_KEY, null);
      return count;
    });
    return { done: true, classified };
  } catch (error) {
    // Done, but the results couldn't be downloaded or the scoped write failed —
    // keep the pointer and retry next run instead of losing a night's verdicts.
    // Same caveat as the status catch: retrying forever is only right if the
    // cause is transient. `status` 404/401 = results gone or we're locked out,
    // so this batch will never apply and the pointer must be cleared by hand;
    // no status at all points at the scoped write (DB), not Anthropic.
    console.error("[job:classify-people] batch results failed", {
      phase: "results",
      status: providerStatus(error),
      ...errorFields(error),
    });
    return { done: false };
  }
}
