import { eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, eventContacts, events } from "@/lib/db/schema";
import type { SearchQueryPlan } from "@dhaga/core";

/**
 * M6 stage 1, applied: resolve a query plan's structured filters to the
 * contact ids they allow. `undefined` = no filters = search everyone.
 * An empty set is meaningful: filters matched nobody.
 */
export async function contactIdsForPlan(
  plan: SearchQueryPlan,
): Promise<Set<string> | undefined> {
  const db = await getDb();
  const sets: Set<string>[] = [];

  if (plan.event) {
    const rows = await db
      .select({ contactId: eventContacts.contactId })
      .from(eventContacts)
      .innerJoin(events, eq(events.id, eventContacts.eventId))
      .where(ilike(events.name, `%${plan.event}%`));
    sets.push(new Set(rows.map((row) => row.contactId)));
  }

  if (plan.company) {
    const rows = await db
      .select({ id: contacts.id })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(ilike(companies.name, `%${plan.company}%`));
    sets.push(new Set(rows.map((row) => row.id)));
  }

  if (plan.tags.length > 0) {
    // Per-element jsonb containment (matches contacts/queries.ts's tag
    // filter) — casting the whole array to text and ILIKE-ing it would match
    // substrings that span across elements (tag "ai" would false-positive on
    // a contact tagged only "retail", since the serialized array contains
    // "...ai...").
    const conditions = plan.tags.map(
      (tag) => sql`${contacts.tags} @> ${JSON.stringify([tag])}::jsonb`,
    );
    const rows = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(or(...conditions) as SQL);
    sets.push(new Set(rows.map((row) => row.id)));
  }

  if (sets.length === 0) return undefined;
  return sets.reduce(
    (acc, set) => new Set([...acc].filter((id) => set.has(id))),
  );
}
