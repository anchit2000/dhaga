import { randomUUID } from "node:crypto";
import type { BatchLLMClient } from "@dhaga/core";
import { signalDetectionSchema } from "@dhaga/core";
import { getDb } from "@/lib/db";
import { signals } from "@/lib/db/schema";
import { recordAiAction } from "@/lib/ai/metering";
import { hasOpenSignal } from "@/lib/repo/signals";
import { setPendingSignalBatchId } from "@/lib/repo/settings";

export type PendingBatchOutcome = { done: false } | { done: true; created: number };

/**
 * Phase 1 of the nightly sweep: check whether the batch submitted on a
 * previous run has finished, and if so, apply its results — the exact same
 * per-contact side effects the old synchronous loop did inline (dedup via
 * hasOpenSignal, insert the signals row, meter real usage from the result).
 */
export async function processPendingBatch(
  batchClient: BatchLLMClient,
  batchId: string,
): Promise<PendingBatchOutcome> {
  let isDone: boolean;
  try {
    isDone = await batchClient.isBatchDone(batchId);
  } catch {
    // Transient failure checking status — try again next run rather than
    // risk discarding a batch id we can't yet confirm has finished.
    return { done: false };
  }
  if (!isDone) return { done: false };

  const db = await getDb();
  try {
    const results = await batchClient.getBatchResults(batchId, signalDetectionSchema);
    let created = 0;
    for (const result of results) {
      if (result.status !== "succeeded" || !result.data || !result.model || !result.usage) {
        // errored/expired/canceled — Anthropic doesn't bill these, and
        // there's nothing to apply for this contact this cycle.
        continue;
      }
      try {
        await recordAiAction("signal_detection", result.model, result.usage);
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
          created += 1;
        }
      } catch {
        // One contact's result failing to apply must never abort the rest
        // of the batch (best-effort, like the old inline loop).
      }
    }
    await setPendingSignalBatchId(null);
    return { done: true, created };
  } catch {
    // Batch reports done but results couldn't be downloaded (transient
    // network issue) — keep the pointer and retry next run instead of
    // silently losing a night's worth of signals.
    return { done: false };
  }
}
