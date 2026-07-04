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

export async function createSession(name: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(sessions).values({ id, name: name.trim() });
  return id;
}

export async function addContactToSession(
  sessionId: string,
  contactId: string,
): Promise<void> {
  const db = await getDb();
  await db
    .insert(sessionContacts)
    .values({ sessionId, contactId })
    .onConflictDoNothing();
}

export async function renameSession(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.update(sessions).set({ name: name.trim() }).where(eq(sessions.id, id));
}

/** Move everyone from one session into another, then drop the empty one. */
export async function mergeSessions(
  fromId: string,
  intoId: string,
): Promise<void> {
  if (fromId === intoId) return;
  const db = await getDb();
  const members = await db
    .select({ contactId: sessionContacts.contactId, scannedAt: sessionContacts.scannedAt })
    .from(sessionContacts)
    .where(eq(sessionContacts.sessionId, fromId));
  for (const member of members) {
    await db
      .insert(sessionContacts)
      .values({ sessionId: intoId, contactId: member.contactId, scannedAt: member.scannedAt })
      .onConflictDoNothing();
  }
  await db.delete(sessionContacts).where(eq(sessionContacts.sessionId, fromId));
  await db.delete(sessions).where(eq(sessions.id, fromId));
}
