import { getMessagingClient } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { listSessionItems, setSessionStatus } from "@/lib/repo/messaging";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import {
  awaitingAnswerReply,
  MAX_SESSION_ITEMS,
  mediaFailedNotice,
  noContactFoundReply,
  processingFailedReply,
  summaryReply,
  truncatedNotice,
  unreadableItemNotice,
} from "@/utils/constants/messaging";
import { processSessionItem } from "./process-item";
import { addNotice, createWalkState, type WalkState } from "./walk-state";

/** The closing summary: what was saved, then every item that wasn't. */
function buildSummary(state: WalkState, truncated: boolean): string {
  const notices = truncated ? [...state.notices, truncatedNotice(MAX_SESSION_ITEMS)] : state.notices;
  const head =
    state.contactCount === 0 && state.noteCount === 0
      // A batch that ended in a question hasn't failed — it's waiting on the
      // sender. Saying "I couldn't find a contact" there would read as a bug.
      ? (state.askedQuestion ? awaitingAnswerReply() : noContactFoundReply())
      : summaryReply({
          contactName: state.firstContactName,
          contactCount: state.contactCount,
          noteCount: state.noteCount,
          factCount: state.factCount,
        });
  return [head, ...notices.map((notice) => `• ${notice}`)].join("\n");
}

/**
 * One item, isolated. A throw here (media that won't download, an LLM outage,
 * a DB blip) costs that ONE item and is reported in the summary — it must not
 * abort the batch, which would strand every later contact card the sender sent.
 */
async function runItem(state: WalkState, item: MessagingSessionItemRow): Promise<void> {
  try {
    await processSessionItem(state, item);
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
      return listSessionItems(session.id);
    });
    const truncated = items.length > MAX_SESSION_ITEMS;
    const batch = truncated ? items.slice(0, MAX_SESSION_ITEMS) : items;

    const state = createWalkState(userId, client, {
      provider: session.provider,
      externalId: session.externalId,
    });
    for (const item of batch) {
      await runItem(state, item);
    }

    await withUserDb(userId, () => setSessionStatus({ sessionId: session.id, status: "done" }));
    await client.sendText({ externalUserId: session.externalId, text: buildSummary(state, truncated) });
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
