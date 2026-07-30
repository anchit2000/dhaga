import {
  blockedExtractionJob,
  claimExtractionJob,
  completeExtractionJob,
  failExtractionJob,
} from "@/lib/repo/extraction-jobs";
import { notifyJobOutcome } from "@/lib/repo/notifications";
import { withUserDb } from "@/lib/db/request-scope";
import { AiBudgetError } from "@/lib/ai/metering";
import type { ExtractionJobKind, ExtractionStreamEvent } from "@/types";
import { processEnrichment, processNote } from "./kinds";

/** Sink for the live progress events the worker route streams to the person
 *  page. Optional: called with no sink, processExtractionJob is a pure
 *  background drain (the daily reaper, retries) and every event is a no-op. */
export type ExtractionEventSink = (event: ExtractionStreamEvent) => void;

function errorMessage(error: unknown): string {
  if (error instanceof AiBudgetError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Extraction failed.";
}

/**
 * Drain one extraction job. Called from the worker route (a normal user-scoped
 * request, so every repo write lands with the right tenant) and safe to call
 * twice — claimExtractionJob only lets the first caller past the pending gate.
 *
 * `onEvent`, when passed, receives live NDJSON progress the route streams to the
 * page; the DB writes below are the source of truth, the events are additive.
 */
export async function processExtractionJob(
  jobId: string,
  userId: string,
  onEvent?: ExtractionEventSink,
): Promise<void> {
  const emit: ExtractionEventSink = onEvent ?? (() => {});
  const job = await withUserDb(userId, () => claimExtractionJob(jobId));
  if (!job) {
    // Not pending — another request (a second tab) already claimed it, or it's
    // already terminal. This stream can't drive the job, so tell the client to
    // reconcile via the slow status-poll fallback instead of ending silently
    // (which would leave that tab spinning until a manual reload).
    emit({ type: "detached" });
    return;
  }
  // Every terminal branch below also records a notification, so a user who
  // navigated away still learns the job finished (the stream events reach only
  // the tab that started it). Best effort by construction — see notifyJobOutcome.
  const kind: ExtractionJobKind = job.kind === "enrichment" ? "enrichment" : "note_extraction";
  const subject = { jobId, contactId: job.contactId, kind };
  try {
    const outcome =
      job.kind === "enrichment"
        ? await processEnrichment(job, userId, emit)
        : await processNote(job, userId, emit);
    if (outcome.blocked) {
      // No AI budget: a terminal, non-retryable state (not a failure). The UI
      // shows a calm notice; the stream reports it as "blocked".
      const message = outcome.notice ?? "Automatic fact extraction is a paid feature.";
      await withUserDb(userId, () => blockedExtractionJob(jobId, message));
      await notifyJobOutcome(userId, subject, { status: "blocked", kind });
      emit({ type: "blocked", message });
    } else if (outcome.failed) {
      const message = outcome.notice ?? "Extraction failed.";
      await withUserDb(userId, () => failExtractionJob(jobId, message));
      await notifyJobOutcome(userId, subject, { status: "error", kind, message });
      emit({ type: "error", message, retryable: true });
    } else {
      // Facts are already committed (extractAndApplyNote's apply phase ran
      // before we got here), so the "writing" count is final and the client can
      // safely refetch on the "done" that follows.
      emit({ type: "stage", stage: "writing", count: outcome.factCount });
      await withUserDb(userId, () =>
        completeExtractionJob(jobId, {
          factCount: outcome.factCount,
          followUpCount: outcome.followUpCount,
        }),
      );
      await notifyJobOutcome(userId, subject, {
        status: "done",
        kind,
        factCount: outcome.factCount,
        followUpCount: outcome.followUpCount,
      });
      emit({
        type: "done",
        factCount: outcome.factCount,
        followUpCount: outcome.followUpCount,
      });
    }
  } catch (error) {
    const message = errorMessage(error);
    await withUserDb(userId, () => failExtractionJob(jobId, message));
    await notifyJobOutcome(userId, subject, { status: "error", kind, message });
    emit({ type: "error", message, retryable: true });
  }
}
