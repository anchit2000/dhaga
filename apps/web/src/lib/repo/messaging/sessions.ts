import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems, type MessagingSessionItemRow } from "@/lib/db/schema";
import type { MessagingItemKind, MessagingSessionStatus } from "@/utils/constants/messaging";

/**
 * TENANT-scoped access (messaging_sessions / messaging_session_items). Every
 * function here is only ever called INSIDE a withUserDb(userId) scope, so it
 * relies on EE's RLS (or the self-host single-user default) for ownership and
 * takes NO userId param — mirroring extraction-jobs/mutations.ts. The session's
 * user_id column is added + defaulted by packages/ee's RLS DDL, so inserts here
 * never mention tenancy. NEVER log the forwarded payload (third-party PII).
 */

/** The open batch for a sender (with its item count + last activity), or null. */
export async function getOpenSession(input: {
  provider: string;
  externalId: string;
}): Promise<{ id: string; itemCount: number; lastItemAt: Date } | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: messagingSessions.id,
      lastItemAt: messagingSessions.lastItemAt,
      itemCount: sql<number>`(
        select count(*)::int from messaging_session_items
        where messaging_session_items.session_id = ${messagingSessions.id}
      )`,
    })
    .from(messagingSessions)
    .where(
      and(
        eq(messagingSessions.provider, input.provider),
        eq(messagingSessions.externalId, input.externalId),
        eq(messagingSessions.status, "open"),
      ),
    )
    .orderBy(desc(messagingSessions.createdAt))
    .limit(1);
  return row ?? null;
}

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

/** All items in a batch, in arrival order. */
export async function listSessionItems(sessionId: string): Promise<MessagingSessionItemRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(messagingSessionItems)
    .where(eq(messagingSessionItems.sessionId, sessionId))
    .orderBy(asc(messagingSessionItems.seq));
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

/** Open batches with no activity since `idleBefore` — the idle sweeper's input. */
export async function findIdleOpenSessions(
  idleBefore: Date,
): Promise<Array<{ id: string; provider: string; externalId: string }>> {
  const db = await getDb();
  return db
    .select({
      id: messagingSessions.id,
      provider: messagingSessions.provider,
      externalId: messagingSessions.externalId,
    })
    .from(messagingSessions)
    .where(and(eq(messagingSessions.status, "open"), lt(messagingSessions.lastItemAt, idleBefore)));
}
