import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { companies, contacts, followUps } from "@/lib/db/schema";

/** Idea #2: "when should I remind you to reach out" — cadence per contact. */

export interface DueReachOut {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  lastTouch: Date;
  everyDays: number;
}

const lastTouch = sql<Date>`COALESCE(${contacts.lastReachedOutAt}, ${contacts.createdAt})`;

export async function listDueReachOuts(): Promise<DueReachOut[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      lastTouch,
      everyDays: contacts.reachOutEveryDays,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      and(
        isNotNull(contacts.reachOutEveryDays),
        sql`${lastTouch} + make_interval(days => ${contacts.reachOutEveryDays}) < now()`,
      ),
    )
    .orderBy(sql`${lastTouch} asc`);
  return rows.map((row) => ({
    ...row,
    lastTouch: new Date(row.lastTouch),
    everyDays: row.everyDays ?? 0,
  }));
}

export function isReachOutDue(
  everyDays: number | null,
  lastTouch: Date,
): boolean {
  if (everyDays == null) return false;
  return Date.now() - lastTouch.getTime() > everyDays * 86_400_000;
}

export async function setCadence(
  contactId: string,
  days: number | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ reachOutEveryDays: days })
    .where(eq(contacts.id, contactId));
}

export async function markReachedOut(contactId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ lastReachedOutAt: new Date() })
    .where(eq(contacts.id, contactId));
}

export interface OpenFollowUpItem {
  id: string;
  contactId: string;
  contactName: string;
  action: string;
  dueHint: string | null;
  createdAt: Date;
}

/** All open follow-ups across the graph, for the Home feed. */
export async function listAllOpenFollowUps(): Promise<OpenFollowUpItem[]> {
  const db = await getDb();
  return db
    .select({
      id: followUps.id,
      contactId: followUps.contactId,
      contactName: contacts.name,
      action: followUps.action,
      dueHint: followUps.dueHint,
      createdAt: followUps.createdAt,
    })
    .from(followUps)
    .innerJoin(contacts, eq(contacts.id, followUps.contactId))
    .where(eq(followUps.status, "open"))
    .orderBy(desc(followUps.createdAt));
}
