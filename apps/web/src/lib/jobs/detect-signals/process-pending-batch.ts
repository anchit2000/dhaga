import { randomUUID } from "node:crypto";
import type { BatchLLMClient } from "@dhaga/core";
import { signalDetectionSchema } from "@dhaga/core";
import { errorFields, providerStatus } from "@dhaga/core/src/logging";
import { getDb } from "@/lib/db/request-scope";
import { signals } from "@/lib/db/schema";
import { recordAiAction } from "@/lib/ai/metering";
import { hasOpenSignal } from "@/lib/repo/signals";
import { setPendingSignalBatchId } from "@/lib/repo/settings";
import type { ScopedRunner } from "./index";

export type PendingBatchOutcome = { done: false } | { done: true; created: number };

/**
 * Phase 1 of the nightly sweep: check whether the batch submitted on a
 * previous run has finished, and if so, apply its results — the exact same
 * per-contact side effects the old synchronous loop did inline (dedup via
 * hasOpenSignal, insert the signals row, meter real usage from the result).
 *
 * The status/results fetches from Anthropic run OUTSIDE `runScoped`, so no
 * tenant connection is held across the network. The result application
 * (metering, dedup read, insert, clearing the pending pointer) is one scoped
 * unit — all DB work, no network — so in hosted mode it commits atomically per
 * tenant and every query is RLS-scoped to that user.
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
    // Transient failure checking status — try again next run rather than
    // risk discarding a batch id we can't yet confirm has finished. But
    // "transient" is an ASSUMPTION, and when it's wrong this returns
    // {done:false} every night forever and signal detection quietly stops.
    // `status` is what decides: 429/5xx = genuinely transient, ignore a lone
    // line; 404 (batch id aged out) or 401/403 (key revoked) is permanent —
    // the pointer will never clear on its own, so clear it and let the next
    // run submit a fresh batch. The same line repeating nightly means
    // permanent whatever the status says.
    console.error("[job:detect-signals] batch poll failed", {
      phase: "status",
      status: providerStatus(error),
      ...errorFields(error),
    });
    return { done: false };
  }
  if (!isDone) return { done: false };

  try {
    const results = await batchClient.getBatchResults(batchId, signalDetectionSchema);
    const created = await runScoped(async () => {
      const db = await getDb();
      let count = 0;
      let applyFailures = 0;
      let firstApplyError: unknown;
      for (const result of results) {
        if (result.status !== "succeeded" || !result.data || !result.model || !result.usage) {
          // errored/expired/canceled — Anthropic doesn't bill these, and
          // there's nothing to apply for this contact this cycle.
          continue;
        }
        try {
          // Message Batches API — half price both directions. See the note in
          // classify-people/process-pending-batch.ts.
          await recordAiAction("signal_detection", result.model, result.usage, { batch: true });
          const { hasSignal, kind, headline, detail, sourceUrl } = result.data;
          // Same dedup guard the synchronous job used — see hasOpenSignal's
          // doc comment for why the sweep would otherwise duplicate the same
          // still-open change every rescan.
          if (hasSignal && kind && !(await hasOpenSignal(result.id, kind))) {
            await db.insert(signals).values({
              id: randomUUID(),
              contactId: result.id,
              kind,
              headline,
              detail,
              sourceUrl,
              status: "new",
            });
            count += 1;
          }
        } catch (error) {
          // One contact's result failing to apply must never abort the rest
          // of the batch (best-effort, like the old inline loop) — counted,
          // not just swallowed, because the pointer is cleared below either way.
          applyFailures += 1;
          firstApplyError ??= error;
        }
      }
      if (applyFailures > 0) {
        // The pending pointer is cleared unconditionally two lines down, so a
        // batch we already paid for is discarded whether or not it applied.
        // Read it as: applyFailures === resultCount means the WHOLE night's
        // batch was thrown away — created is 0, nothing retries it, and the
        // cause is systemic (schema drift in signals, RLS/pool failure, a
        // metering cap rejecting every recordAiAction), not one odd contact.
        console.error("[job:detect-signals] batch results failed to apply", {
          resultCount: results.length,
          applyFailures,
          ...errorFields(firstApplyError),
        });
      }
      await setPendingSignalBatchId(null);
      return count;
    });
    return { done: true, created };
  } catch (error) {
    // Batch reports done but the results couldn't be downloaded (transient
    // network issue), or the scoped write failed — keep the pointer and retry
    // next run instead of silently losing a night's worth of signals. Same
    // caveat as the status catch: retrying forever is only right if the cause
    // really is transient. `status` 404/401 = the results are gone or we're
    // locked out, so this batch will never apply and the pointer must be
    // cleared by hand; no status at all points at the scoped write (DB), not
    // Anthropic.
    console.error("[job:detect-signals] batch results failed", {
      phase: "results",
      status: providerStatus(error),
      ...errorFields(error),
    });
    return { done: false };
  }
}
