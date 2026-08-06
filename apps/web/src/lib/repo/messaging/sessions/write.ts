import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems } from "@/lib/db/schema";
import type { MessagingItemKind, MessagingSessionStatus } from "@/utils/constants/messaging";
import { getOpenSession } from "./read";

/**
 * Writes over the capture batches. Same tenancy contract as ./read: called only
 * inside a withUserDb(userId) scope, so the `user_id` column packages/ee's RLS
 * DDL adds is populated by its session-variable DEFAULT — inserts here never
 * mention tenancy. NEVER log the forwarded payload (third-party PII).
 */

/** The sender's open batch, creating a fresh empty one when none is open. */
export async function getOrCreateOpenSession(input: {
  provider: string;
  externalId: string;
}): Promise<{ id: string; itemCount: number; lastItemAt: Date }> {
  const existing = await getOpenSession(input);
  if (existing) return existing;
  const db = await getDb();
  const id = randomUUID();
  const now = new Date();
  await db.insert(messagingSessions).values({
    id,
    provider: input.provider,
    externalId: input.externalId,
    status: "open",
    lastItemAt: now,
  });
  return { id, itemCount: 0, lastItemAt: now };
}

/**
 * Append one forwarded item. seq = max(seq)+1 (1-based). Dedupe on the unique
 * provider_message_id via `on conflict do nothing` + RETURNING: an empty return
 * means a duplicate webhook delivery (NULL provider_message_id never conflicts,
 * so synthesized items always insert). On a real insert, bump the parent's
 * last_item_at/updated_at so idle-flush timing tracks the newest item.
 */
export async function appendSessionItem(input: {
  sessionId: string;
  kind: MessagingItemKind;
  payload: unknown;
  providerMessageId: string | null;
}): Promise<{ id: string; duplicate: boolean }> {
  const db = await getDb();
  const [seqRow] = await db
    .select({ nextSeq: sql<number>`(coalesce(max(${messagingSessionItems.seq}), 0) + 1)::int` })
    .from(messagingSessionItems)
    .where(eq(messagingSessionItems.sessionId, input.sessionId));
  const nextSeq = seqRow?.nextSeq ?? 1;
  const id = randomUUID();
  const inserted = await db
    .insert(messagingSessionItems)
    .values({
      id,
      sessionId: input.sessionId,
      seq: nextSeq,
      kind: input.kind,
      payload: input.payload,
      providerMessageId: input.providerMessageId,
    })
    .onConflictDoNothing({ target: messagingSessionItems.providerMessageId })
    .returning({ id: messagingSessionItems.id });
  const duplicate = inserted.length === 0;
  if (!duplicate) {
    const now = new Date();
    await db
      .update(messagingSessions)
      .set({ lastItemAt: now, updatedAt: now })
      .where(eq(messagingSessions.id, input.sessionId));
  }
  return { id, duplicate };
}

/** Stamp one item done. Called after the item's writes land, never before. */
export async function markSessionItemProcessed(itemId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(messagingSessionItems)
    .set({ processedAt: new Date() })
    .where(eq(messagingSessionItems.id, itemId));
}

/** Move a batch through its lifecycle (open → processing → done|failed). */
export async function setSessionStatus(input: {
  sessionId: string;
  status: MessagingSessionStatus;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(messagingSessions)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(messagingSessions.id, input.sessionId));
}
