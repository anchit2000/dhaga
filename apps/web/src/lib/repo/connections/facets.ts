import { aliasedTable, and, count, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, eventContacts, events } from "@/lib/db/schema";
import { displayPredicate } from "./predicate";
import type { ConnectionFacet } from "./types";

export async function listConnectionFacets(contactId: string): Promise<ConnectionFacet[]> {
  const db = await getDb();
  const self = aliasedTable(contacts, "facet_self");
  const mine = aliasedTable(eventContacts, "facet_mine");
  const [companyCount, eventRows, predicateRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(contacts)
      .innerJoin(self, eq(self.companyId, contacts.companyId))
      .where(and(eq(self.id, contactId), ne(contacts.id, contactId))),
    db
      .select({ value: events.id, label: events.name, count: count() })
      .from(mine)
      .innerJoin(eventContacts, eq(eventContacts.eventId, mine.eventId))
      .innerJoin(events, eq(events.id, mine.eventId))
      .where(and(eq(mine.contactId, contactId), ne(eventContacts.contactId, contactId)))
      .groupBy(events.id, events.name),
    db
      .select({ value: edges.predicate, count: count() })
      .from(edges)
      .where(
        and(
          isNull(edges.deletedAt),
          or(eq(edges.srcId, contactId), eq(edges.dstId, contactId)),
        ),
      )
      .groupBy(edges.predicate),
  ]);
  const facets: ConnectionFacet[] = [];
  const sameCompanyCount = Number(companyCount[0]?.count ?? 0);
  if (sameCompanyCount > 0) {
    facets.push({ source: "company", value: "same_company", label: "Same company", count: sameCompanyCount });
  }
  for (const row of eventRows) {
    facets.push({ source: "event", value: row.value, label: row.label, count: Number(row.count) });
  }
  for (const row of predicateRows) {
    facets.push({ source: "relationship", value: row.value, label: displayPredicate(row.value), count: Number(row.count) });
  }
  return facets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
