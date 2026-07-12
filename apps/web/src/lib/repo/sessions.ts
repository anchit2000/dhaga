import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  contacts,
  sessionContacts,
  sessions,
  type SessionRow,
} from "@/lib/db/schema";

export interface SessionListItem extends SessionRow {
  contactCount: number;
}

export async function listSessions(): Promise<SessionListItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      session: sessions,
      contactCount: count(sessionContacts.contactId),
    })
    .from(sessions)
    .leftJoin(sessionContacts, eq(sessionContacts.sessionId, sessions.id))
    .groupBy(sessions.id)
    .orderBy(desc(sessions.startedAt));
  return rows.map((row) => ({ ...row.session, contactCount: row.contactCount }));
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return row ?? null;
}

export async function listSessionContacts(sessionId: string) {
  const db = await getDb();
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      scannedAt: sessionContacts.scannedAt,
    })
    .from(sessionContacts)
    .innerJoin(contacts, eq(sessionContacts.contactId, contacts.id))
    .where(eq(sessionContacts.sessionId, sessionId))
    .orderBy(desc(sessionContacts.scannedAt));
}

export async function listContactSessions(contactId: string) {
  const db = await getDb();
  return db
    .select({ id: sessions.id, name: sessions.name, scannedAt: sessionContacts.scannedAt })
    .from(sessionContacts)
    .innerJoin(sessions, eq(sessionContacts.sessionId, sessions.id))
    .where(eq(sessionContacts.contactId, contactId))
    .orderBy(desc(sessionContacts.scannedAt));
}

export async function createSession(name: string, geohash?: string | null): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(sessions).values({ id, name: name.trim(), geohash: geohash ?? null });
  return id;
}

export async function addContactToSession(
  sessionId: string,
  contactId: string,
  scannedAt?: Date,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(sessionContacts)
    .values({ sessionId, contactId, ...(scannedAt ? { scannedAt } : {}) })
    .onConflictDoNothing();
}

export async function renameSession(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.update(sessions).set({ name: name.trim() }).where(eq(sessions.id, id));
}

/**
 * Move everyone from one session into another, then drop the empty one.
 *
 * Wrapped in one transaction: every statement here is a pure DB read/write
 * (no outbound network calls), so holding a connection open across all of
 * them is safe. Without this, a failure partway through — e.g. after some
 * members are copied into intoId but before fromId's own sessionContacts
 * rows and the fromId session itself are deleted — leaves a half-merged
 * state: some contacts belong to both sessions, and the "merged away"
 * session still exists with some of its original members. All-or-nothing
 * closes that gap.
 */
export async function mergeSessions(
  fromId: string,
  intoId: string,
): Promise<void> {
  if (fromId === intoId) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const members = await tx
      .select({ contactId: sessionContacts.contactId, scannedAt: sessionContacts.scannedAt })
      .from(sessionContacts)
      .where(eq(sessionContacts.sessionId, fromId));
    for (const member of members) {
      await tx
        .insert(sessionContacts)
        .values({ sessionId: intoId, contactId: member.contactId, scannedAt: member.scannedAt })
        .onConflictDoNothing();
    }
    await tx.delete(sessionContacts).where(eq(sessionContacts.sessionId, fromId));
    await tx.delete(sessions).where(eq(sessions.id, fromId));
  });
}
