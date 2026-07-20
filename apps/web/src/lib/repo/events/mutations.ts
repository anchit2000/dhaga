import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { eventContacts, events } from "@/lib/db/schema";

export async function createEvent(
  name: string,
  opts?: { geohash?: string | null; emoji?: string | null; color?: string | null; tags?: string[] },
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(events).values({
    id,
    name: name.trim(),
    geohash: opts?.geohash ?? null,
    emoji: opts?.emoji ?? null,
    color: opts?.color ?? null,
    tags: opts?.tags ?? [],
  });
  return id;
}

/** Update a group's decoration. Omitted keys are left untouched. */
export async function updateEventMeta(
  id: string,
  meta: { color?: string | null; emoji?: string | null; tags?: string[] },
): Promise<void> {
  const db = await getDb();
  await db
    .update(events)
    .set({
      ...(meta.color !== undefined ? { color: meta.color } : {}),
      ...(meta.emoji !== undefined ? { emoji: meta.emoji } : {}),
      ...(meta.tags !== undefined ? { tags: meta.tags } : {}),
    })
    .where(eq(events.id, id));
}

export async function addContactToEvent(
  eventId: string,
  contactId: string,
  scannedAt?: Date,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(eventContacts)
    .values({ eventId, contactId, ...(scannedAt ? { scannedAt } : {}) })
    .onConflictDoNothing();
}

/** Detach a person from an event (idempotent — no-op if they weren't attached). */
export async function removeContactFromEvent(
  eventId: string,
  contactId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(eventContacts)
    .where(and(eq(eventContacts.eventId, eventId), eq(eventContacts.contactId, contactId)));
}

export async function renameEvent(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.update(events).set({ name: name.trim() }).where(eq(events.id, id));
}

/**
 * Move everyone from one event into another, then drop the empty one.
 *
 * Wrapped in one transaction: every statement here is a pure DB read/write
 * (no outbound network calls), so holding a connection open across all of
 * them is safe. Without this, a failure partway through — e.g. after some
 * members are copied into intoId but before fromId's own eventContacts
 * rows and the fromId event itself are deleted — leaves a half-merged
 * state: some contacts belong to both events, and the "merged away"
 * event still exists with some of its original members. All-or-nothing
 * closes that gap.
 */
export async function mergeEvents(
  fromId: string,
  intoId: string,
): Promise<void> {
  if (fromId === intoId) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const members = await tx
      .select({ contactId: eventContacts.contactId, scannedAt: eventContacts.scannedAt })
      .from(eventContacts)
      .where(eq(eventContacts.eventId, fromId));
    for (const member of members) {
      await tx
        .insert(eventContacts)
        .values({ eventId: intoId, contactId: member.contactId, scannedAt: member.scannedAt })
        .onConflictDoNothing();
    }
    await tx.delete(eventContacts).where(eq(eventContacts.eventId, fromId));
    await tx.delete(events).where(eq(events.id, fromId));
  });
}
