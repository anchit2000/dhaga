import { getMessagingClient } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import {
  listUnprocessedSessionItems,
  markSessionItemProcessed,
  setSessionStatus,
} from "@/lib/repo/messaging";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import {
  attributionHeader,
  attributionLines,
  awaitingAnswerReply,
  MAX_SESSION_ITEMS,
  mediaFailedNotice,
  noContactFoundReply,
  partialRunNotice,
  pendingConfirmationsNotice,
  processingFailedReply,
  summaryReply,
  unreadableItemNotice,
} from "@/utils/constants/messaging";
import { processSessionItem } from "./process-item";
import { addNotice, createWalkState, type WalkState } from "./walk-state";

/**
 * The closing summary: what was saved, WHO each note was filed on and on what
 * basis, then everything the walk could not do. The attribution ledger is not
 * decoration — filing is guesswork, and the sender is the only one who can catch
 * a wrong guess, so it is stated rather than left implicit.
 */
function buildSummary(state: WalkState, remaining: number): string {
  const notices = [...state.notices];
  if (state.pendingConfirmations > 0) {
    notices.push(pendingConfirmationsNotice(state.pendingConfirmations));
  }
  if (remaining > 0) notices.push(partialRunNotice(MAX_SESSION_ITEMS, remaining));
  const head =
    state.contactCount === 0 && state.noteCount === 0
      // A batch that ended in a question hasn't failed — it's waiting on the
      // sender. Saying "I couldn't find a contact" there would read as a bug.
      ? (state.pendingConfirmations > 0 ? awaitingAnswerReply() : noContactFoundReply())
      : summaryReply({
          contactName: state.firstContactName,
          contactCount: state.contactCount,
          noteCount: state.noteCount,
          factCount: state.factCount,
        });
  const ledger = attributionLines(state.attributions);
  return [
    head,
    ...(ledger.length > 0 ? [attributionHeader(), ...ledger.map((line) => `• ${line}`)] : []),
    ...notices.map((notice) => `• ${notice}`),
  ].join("\n");
}

/**
 * One item, isolated. A throw here (media that won't download, an LLM outage,
 * a DB blip) costs that ONE item and is reported in the summary — it must not
 * abort the batch, which would strand every later contact card the sender sent.
 */
async function runItem(state: WalkState, item: MessagingSessionItemRow): Promise<void> {
  try {
    await processSessionItem(state, item);
    // Stamped only on success, and only after the item's writes landed: a
    // transient failure (LLM outage, media blip) must stay unprocessed so a
    // retry picks it up again, while a completed item can never be re-walked
    // into duplicate contacts and notes.
    await withUserDb(state.userId, () => markSessionItemProcessed(item.id));
  } catch (error) {
    logActionError("messaging_process_item", error);
    const media = item.kind === "image" || item.kind === "audio";
    addNotice(state, media ? mediaFailedNotice() : unreadableItemNotice());
  }
}

/**
 * Positional batch processor. Walks a session's items in arrival order, turning
 * them into contacts/notes/facts, then replies with a summary. Runs in the
 * background (via `after()` or the idle sweeper) so it must never rethrow: any
 * failure marks the session failed and sends a retry nudge. NEVER logs the
 * forwarded content — only logActionError metadata.
 */
export async function processMessagingSession(
  userId: string,
  session: { id: string; provider: string; externalId: string },
): Promise<void> {
  try {
    const client = getMessagingClient(session.provider);
    // Load phase: mark processing (idempotent) and read the items in one scope.
    const items = await withUserDb(userId, async () => {
      await setSessionStatus({ sessionId: session.id, status: "processing" });
      // UNPROCESSED only: a re-drive of a batch that was killed mid-walk (or a
      // second pass over one too big for a single run) resumes here instead of
      // re-creating everything it already wrote.
      return listUnprocessedSessionItems(session.id);
    });
    // MAX_SESSION_ITEMS bounds ONE RUN, not the batch: the overflow is left
    // unprocessed and picked up by the next sweep, so a day's worth of forwards
    // is drained rather than truncated away.
    const remaining = Math.max(0, items.length - MAX_SESSION_ITEMS);
    const batch = remaining > 0 ? items.slice(0, MAX_SESSION_ITEMS) : items;

    const state = createWalkState(userId, client, {
      provider: session.provider,
      externalId: session.externalId,
    });
    for (const item of batch) {
      await runItem(state, item);
    }

    // Only a fully-drained batch is done. Leaving the remainder in `processing`
    // is what hands it to the stalled-batch sweep (lib/jobs/messaging-flush).
    await withUserDb(userId, () =>
      setSessionStatus({ sessionId: session.id, status: remaining > 0 ? "processing" : "done" }),
    );
    await client.sendText({ externalUserId: session.externalId, text: buildSummary(state, remaining) });
  } catch (error) {
    logActionError("messaging_process_session", error);
    // Best-effort cleanup — each in its own try so a second failure can't mask
    // the first or leave the session stuck in "processing".
    try {
      await withUserDb(userId, () => setSessionStatus({ sessionId: session.id, status: "failed" }));
    } catch (statusError) {
      logActionError("messaging_process_session_status", statusError);
    }
    try {
      // Re-resolve the client here: the failure above may have been the client
      // lookup itself, so we can't rely on a client bound in the try scope.
      await getMessagingClient(session.provider).sendText({
        externalUserId: session.externalId,
        text: processingFailedReply(),
      });
    } catch (sendError) {
      logActionError("messaging_process_session_reply", sendError);
    }
  }
}
