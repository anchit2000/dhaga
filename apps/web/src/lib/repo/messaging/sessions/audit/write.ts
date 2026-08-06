import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems } from "@/lib/db/schema";
import type { MessagingItemOutcome } from "@/utils/constants/messaging";

/**
 * Writes the audit trail the capture log reads back. Called only inside a
 * withUserDb(userId) scope, and always in the SAME scope as the contact/note
 * writes each verdict describes — so a verdict can never outlive the thing it
 * claims happened, and a batch killed mid-walk leaves no message claiming an
 * outcome that was rolled back.
 *
 * The stored detail carries ids and names, never note bodies: the log links to
 * what a message produced, and the message's own content is already on the item
 * row. NEVER log any of it (CLAUDE.md — no contact PII in server logs).
 */

/** What a verdict points at, so the log can link straight to the result. */
export interface ItemOutcomeDetail {
  contactId?: string;
  contactName?: string;
  noteId?: string;
  confirmationId?: string;
  /** PII-free explanation for the verdicts that need one (unreadable, unaccounted). */
  reason?: string;
}

/** Record what one message became. `processedAt` is stamped alongside, so an
 *  item is only ever "processed" and "explained" together. */
export async function recordItemOutcome(input: {
  itemId: string;
  kind: MessagingItemOutcome;
  detail?: ItemOutcomeDetail;
}): Promise<void> {
  await recordItemOutcomes({ itemIds: [input.itemId], kind: input.kind, detail: input.detail });
}

/**
 * Bulk form: one UPDATE per verdict GROUP rather than one per message. A
 * ten-message batch resolving into two people must not cost ten round trips
 * against a three-connection tenant pool.
 */
export async function recordItemOutcomes(input: {
  itemIds: readonly string[];
  kind: MessagingItemOutcome;
  detail?: ItemOutcomeDetail;
}): Promise<void> {
  if (input.itemIds.length === 0) return;
  const db = await getDb();
  await db
    .update(messagingSessionItems)
    .set({
      outcomeKind: input.kind,
      outcome: input.detail ?? null,
      processedAt: new Date(),
    })
    .where(inArray(messagingSessionItems.id, [...input.itemIds]));
}

/**
 * Close out a batch's audit record: when it finished, the exact reply the sender
 * was sent, and a PII-free failure code when it failed (see
 * MESSAGING_BATCH_FAILURES). Storing the reply verbatim is what keeps the chat
 * and the capture log from ever disagreeing about what happened.
 */
export async function recordSessionOutcome(input: {
  sessionId: string;
  summary: string | null;
  error: string | null;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(messagingSessions)
    .set({
      processedAt: new Date(),
      summary: input.summary,
      error: input.error,
      updatedAt: new Date(),
    })
    .where(eq(messagingSessions.id, input.sessionId));
}
