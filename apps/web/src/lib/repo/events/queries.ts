import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  contacts,
  eventContacts,
  events,
  type EventRow,
} from "@/lib/db/schema";
import { TABLE_FILTER_OPTION_LIMIT } from "@/utils/constants/table";

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

/** Server-paginated events for the /app/events table: name search + tag filter. */
// TODO(search-index): route through getSearchIndex() (needs paginated list support)
export async function listEventsPage({ page, pageSize, name, tag }: {
  page: number;
  pageSize: number;
  name?: string;
  tag?: string;
}): Promise<{ rows: EventListItem[]; total: number }> {
  const db = await getDb();
  const conditions = [
    name ? ilike(events.name, `%${name}%`) : undefined,
    tag ? sql`${events.tags} @> ${JSON.stringify([tag])}::jsonb` : undefined,
  ].filter((condition) => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [totalRow]] = await Promise.all([
    db
      .select({ event: events, contactCount: count(eventContacts.contactId) })
      .from(events)
      .leftJoin(eventContacts, eq(eventContacts.eventId, events.id))
      .where(where)
      .groupBy(events.id)
      .orderBy(desc(events.startedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(events).where(where),
  ]);
  return {
    rows: rows.map((row) => ({ ...row.event, contactCount: row.contactCount })),
    total: totalRow?.value ?? 0,
  };
}

/** Distinct group tags for the table's tag filter dropdown. */
export async function listEventFilterOptions(): Promise<{ tags: string[] }> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ tag: sql<string>`jsonb_array_elements_text(${events.tags})` })
    .from(events)
    .limit(TABLE_FILTER_OPTION_LIMIT);
  return { tags: rows.map((row) => row.tag).sort() };
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
