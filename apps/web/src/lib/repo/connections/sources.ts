import { aliasedTable, and, asc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { contacts, edges, eventContacts, events } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";
import { displayPredicate } from "./predicate";
import type { ConnectionReason } from "./types";

interface SourceRow {
  id: string;
  name: string;
  title: string | null;
  source: string;
}

type AddFn = (row: SourceRow, reason: ConnectionReason) => void;

export async function addCompanyMatches(
  db: DhagaDb,
  contactId: string,
  common: (SQL | undefined)[],
  limit: number,
  add: AddFn,
): Promise<void> {
  const self = aliasedTable(contacts, "connection_self");
  const companyRows = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title, source: contacts.source })
    .from(contacts)
    .innerJoin(self, eq(self.companyId, contacts.companyId))
    .where(and(eq(self.id, contactId), ne(contacts.id, contactId), ...common))
    .orderBy(asc(contacts.name), asc(contacts.id))
    .limit(limit + 1);
  for (const row of companyRows) {
    add(row, { source: "company", value: "same_company", label: "Same company" });
  }
}

export async function addEventMatches(
  db: DhagaDb,
  contactId: string,
  common: (SQL | undefined)[],
  limit: number,
  eventIds: string[],
  add: AddFn,
): Promise<void> {
  const mine = aliasedTable(eventContacts, "connection_mine");
  const eventRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      source: contacts.source,
      eventId: events.id,
      eventName: events.name,
    })
    .from(mine)
    .innerJoin(eventContacts, eq(eventContacts.eventId, mine.eventId))
    .innerJoin(contacts, eq(contacts.id, eventContacts.contactId))
    .innerJoin(events, eq(events.id, mine.eventId))
    .where(
      and(
        eq(mine.contactId, contactId),
        ne(contacts.id, contactId),
        eventIds.length > 0 ? inArray(events.id, eventIds) : undefined,
        ...common,
      ),
    )
    .orderBy(asc(contacts.name), asc(contacts.id))
    .limit(limit + 1);
  for (const row of eventRows) {
    add(row, { source: "event", value: row.eventId, label: row.eventName });
  }
}

export async function addRelationshipMatches(
  db: DhagaDb,
  contactId: string,
  common: (SQL | undefined)[],
  limit: number,
  predicates: string[],
  add: AddFn,
): Promise<void> {
  const edgeRows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      source: contacts.source,
      predicate: edges.predicate,
    })
    .from(edges)
    .innerJoin(
      contacts,
      or(
        and(eq(edges.srcId, contactId), eq(edges.dstType, "contact"), eq(contacts.id, edges.dstId)),
        and(eq(edges.dstId, contactId), eq(edges.srcType, "contact"), eq(contacts.id, edges.srcId)),
      ),
    )
    .where(
      and(
        isNull(edges.deletedAt),
        predicates.length > 0 ? inArray(edges.predicate, predicates) : undefined,
        ...common,
      ),
    )
    .orderBy(asc(contacts.name), asc(contacts.id))
    .limit(limit + 1);
  for (const row of edgeRows) {
    add(row, {
      source: "relationship",
      value: row.predicate,
      label: displayPredicate(row.predicate),
    });
  }
}
