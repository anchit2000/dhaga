import { getMessagingClient } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { BatchPlanUnavailableError, planMessagingBatch } from "@/lib/ai/batch-plan";
import { AiBudgetError } from "@/lib/ai/metering";
import { findBatchCandidates } from "@/lib/repo/edge-suggestions";
import {
  listUnprocessedSessionItems,
  recordItemOutcomes,
  recordSessionOutcome,
  setSessionStatus,
} from "@/lib/repo/messaging";
import {
  batchFailureReply,
  MAX_SESSION_ITEMS,
  partialRunNotice,
} from "@/utils/constants/messaging";
import { applyPlan, buildApplyContext } from "./apply";
import { deriveBatch } from "./derive";
import { guessNames } from "./names";
import { buildBatchSummary } from "./summary";

/**
 * Process one closed batch: DERIVE every message to text, PLAN the whole batch
 * in one LLM call, APPLY the plan deterministically, then report.
 *
 * This replaced a positional walk that read each message on its own with a
 * "current contact" cursor carried between them. No call ever saw two messages
 * at once, so "Create a new contact" could not refer to the message before it —
 * it created a contact named "Unnamed contact" instead, while the note it was
 * about sat unreachable in a confirmation. Planning the batch as a whole is what
 * removes that entire class of failure (packages/core/src/schemas/batch-plan.ts).
 *
 * Runs in the background (an `after()` or the idle sweeper), so it must never
 * rethrow: a failure records a PII-free reason, leaves the batch RETRYABLE, and
 * tells the sender. NEVER logs the forwarded content.
 */
export async function processMessagingSession(
  userId: string,
  session: { id: string; provider: string; externalId: string },
): Promise<void> {
  const client = getMessagingClient(session.provider);
  let reply: string;
  try {
    reply = await runBatch(userId, session);
    await withUserDb(userId, async () => {
      await setSessionStatus({ sessionId: session.id, status: "done" });
      await recordSessionOutcome({ sessionId: session.id, summary: reply, error: null });
    });
  } catch (error) {
    reply = await failBatch(userId, session.id, error);
  }
  try {
    await client.sendText({ externalUserId: session.externalId, text: reply });
  } catch (sendError) {
    logActionError("messaging_process_session_reply", sendError);
  }
}

async function runBatch(
  userId: string,
  session: { id: string; provider: string; externalId: string },
): Promise<string> {
  const client = getMessagingClient(session.provider);
  const items = await withUserDb(userId, async () => {
    await setSessionStatus({ sessionId: session.id, status: "processing" });
    // UNPROCESSED only, so a batch killed mid-run resumes instead of re-creating
    // everything it already wrote.
    return listUnprocessedSessionItems(session.id);
  });
  const remaining = Math.max(0, items.length - MAX_SESSION_ITEMS);
  const batch = remaining > 0 ? items.slice(0, MAX_SESSION_ITEMS) : items;

  // 1. DERIVE — media downloads and vision/transcription calls, no DB scope held.
  const { derived, unreadable } = await deriveBatch(userId, client, batch);
  if (unreadable.length > 0) {
    await withUserDb(userId, () =>
      recordItemOutcomes({
        itemIds: unreadable.map((entry) => entry.item.id),
        kind: "unreadable",
        detail: { reason: unreadable[0].reason },
      }),
    );
  }
  if (derived.length === 0) return buildBatchSummary(EMPTY_RESULT, unreadable);

  // 2. CANDIDATES — one query for every name the batch might mention, never a
  // per-name fan-out (that has exhausted the three-connection tenant pool here).
  const candidates = await withUserDb(userId, () =>
    findBatchCandidates(guessNames(derived.map((item) => item.text))),
  );

  // 3. PLAN — the whole batch, one call, no connection held across it.
  // Projected to exactly {seq, kind, text}: the prompt reads only these, and
  // handing the AI module the full DerivedItem would pass it the stored rows and
  // their raw payloads. Nothing there is needed, and it is precisely the
  // forwarded content that must never reach a log line (CLAUDE.md privacy).
  const plan = await planMessagingBatch(
    userId,
    derived.map(({ seq, kind, text }) => ({ seq, kind, text })),
    candidates,
  );

  // 4. APPLY — deterministic writes plus the per-message audit trail.
  const context = buildApplyContext(userId, derived, candidates);
  const result = await applyPlan(context, plan);
  const summary = buildBatchSummary(result, unreadable);
  return remaining > 0 ? `${summary}\n• ${partialRunNotice(MAX_SESSION_ITEMS, remaining)}` : summary;
}

const EMPTY_RESULT = { people: [], unclearCount: 0, factCount: 0, unaccountedSeqs: [] };

/**
 * Record why a batch failed and tell the sender. Deliberately NO fallback to a
 * per-message walk: the old behaviour is the bug this replaced, and quietly
 * degrading to it would rebuild the wrong graph while reporting success.
 *
 * The batch stays retryable — items keep their `processed_at` NULL, so a DONE
 * re-drives exactly what did not land.
 */
async function failBatch(userId: string, sessionId: string, error: unknown): Promise<string> {
  logActionError("messaging_process_session", error);
  const code = failureCode(error);
  try {
    await withUserDb(userId, async () => {
      await setSessionStatus({ sessionId, status: "failed" });
      await recordSessionOutcome({ sessionId, summary: null, error: code });
    });
  } catch (statusError) {
    logActionError("messaging_process_session_status", statusError);
  }
  return batchFailureReply(code);
}

/** A PII-free code from a thrown error — safe to persist and to render. */
function failureCode(error: unknown): string {
  if (error instanceof AiBudgetError) return "over_budget";
  if (error instanceof BatchPlanUnavailableError) return error.reason;
  return "apply_failed";
}
