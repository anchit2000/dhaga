import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { contacts, edges, eventContacts } from "@/lib/db/schema";
import type { DhagaDb } from "@/lib/db";

/** Expand a contact's direct connections into the warm network reachable
 *  through a shared edge, event, or company — extracted out of
 *  recommendContactsPage so that orchestration stays readable. */
export async function resolveWarmContactIds(
  db: DhagaDb,
  directIds: string[],
): Promise<Set<string>> {
  const warmIds = new Set<string>();
  if (directIds.length > 0) {
    const [edgeRows, directEvents, directCompanies] = await Promise.all([
      db
        .select({ srcId: edges.srcId, dstId: edges.dstId })
        .from(edges)
        .where(
          and(
            isNull(edges.deletedAt),
            or(inArray(edges.srcId, directIds), inArray(edges.dstId, directIds)),
          ),
        )
        .limit(500),
      db
        .select({ eventId: eventContacts.eventId })
        .from(eventContacts)
        .where(inArray(eventContacts.contactId, directIds))
        .limit(100),
      db
        .select({ companyId: contacts.companyId })
        .from(contacts)
        .where(inArray(contacts.id, directIds)),
    ]);
    for (const row of edgeRows) {
      if (!directIds.includes(row.srcId)) warmIds.add(row.srcId);
      if (!directIds.includes(row.dstId)) warmIds.add(row.dstId);
    }
    const eventIds = [...new Set(directEvents.map((row) => row.eventId))];
    if (eventIds.length > 0) {
      const rows = await db
        .select({ id: eventContacts.contactId })
        .from(eventContacts)
        .where(inArray(eventContacts.eventId, eventIds))
        .limit(500);
      for (const row of rows) warmIds.add(row.id);
    }
    const companyIds = directCompanies
      .map((row) => row.companyId)
      .filter((id): id is string => Boolean(id));
    if (companyIds.length > 0) {
      const rows = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(inArray(contacts.companyId, companyIds))
        .limit(500);
      for (const row of rows) warmIds.add(row.id);
    }
  }
  return warmIds;
}
