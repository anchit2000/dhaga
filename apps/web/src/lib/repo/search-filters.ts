import { eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, sessionContacts, sessions } from "@/lib/db/schema";
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

  if (plan.session) {
    const rows = await db
      .select({ contactId: sessionContacts.contactId })
      .from(sessionContacts)
      .innerJoin(sessions, eq(sessions.id, sessionContacts.sessionId))
      .where(ilike(sessions.name, `%${plan.session}%`));
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
    const conditions = plan.tags.map((tag) =>
      ilike(sql`${contacts.tags}::text`, `%${tag}%`),
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
