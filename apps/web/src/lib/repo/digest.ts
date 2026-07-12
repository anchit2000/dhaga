import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, facts, followUps, eventContacts } from "@/lib/db/schema";

export interface DigestPerson {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  facts: string[];
  followUps: string[];
}

/** Everything the post-event digest email needs, one event at a time. */
export async function eventDigestData(eventId: string): Promise<DigestPerson[]> {
  const db = await getDb();
  const people = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(eventContacts)
    .innerJoin(contacts, eq(contacts.id, eventContacts.contactId))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(eventContacts.eventId, eventId));
  if (people.length === 0) return [];

  const ids = people.map((person) => person.id);
  const [allFacts, allFollowUps] = await Promise.all([
    db
      .select({ contactId: facts.contactId, text: facts.text })
      .from(facts)
      .where(and(inArray(facts.contactId, ids), isNull(facts.deletedAt))),
    db
      .select({ contactId: followUps.contactId, action: followUps.action })
      .from(followUps)
      .where(and(inArray(followUps.contactId, ids), eq(followUps.status, "open"))),
  ]);

  return people.map((person) => ({
    ...person,
    facts: allFacts
      .filter((fact) => fact.contactId === person.id)
      .slice(0, 3)
      .map((fact) => fact.text),
    followUps: allFollowUps
      .filter((followUp) => followUp.contactId === person.id)
      .map((followUp) => followUp.action),
  }));
}
