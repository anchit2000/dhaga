import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
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
