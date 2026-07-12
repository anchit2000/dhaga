import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  contacts,
  eventContacts,
  events,
  type EventRow,
} from "@/lib/db/schema";

export interface EventListItem extends EventRow {
  contactCount: number;
}

export async function listEvents(limit?: number): Promise<EventListItem[]> {
  const db = await getDb();
  const result = db
    .select({
      event: events,
      contactCount: count(eventContacts.contactId),
    })
    .from(events)
    .leftJoin(eventContacts, eq(eventContacts.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.startedAt));
  const rows = await (limit ? result.limit(limit) : result);
  return rows.map((row) => ({ ...row.event, contactCount: row.contactCount }));
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return row ?? null;
}

export async function listEventContacts(eventId: string) {
  const db = await getDb();
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      scannedAt: eventContacts.scannedAt,
    })
    .from(eventContacts)
    .innerJoin(contacts, eq(eventContacts.contactId, contacts.id))
    .where(eq(eventContacts.eventId, eventId))
    .orderBy(desc(eventContacts.scannedAt));
}

export async function listContactEvents(contactId: string) {
  const db = await getDb();
  return db
    .select({ id: events.id, name: events.name, scannedAt: eventContacts.scannedAt })
    .from(eventContacts)
    .innerJoin(events, eq(eventContacts.eventId, events.id))
    .where(eq(eventContacts.contactId, contactId))
    .orderBy(desc(eventContacts.scannedAt));
}

export async function createEvent(name: string, geohash?: string | null): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(events).values({ id, name: name.trim(), geohash: geohash ?? null });
  return id;
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
