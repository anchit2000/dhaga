import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, eventContacts, notes } from "@/lib/db/schema";
import { surfaceableContact } from "@/lib/repo/contacts/surfaceable";
import { lastTouchSql } from "@/lib/repo/last-touch";

/**
 * The one query the suggestion engine adds: everything the scorer needs about a
 * gathered candidate that its source row didn't carry (starred, cadence, last
 * touch, graph degree). Bounded by the id list the sources produced (~50 rows),
 * so it needs no LIMIT of its own.
 *
 * This is also where the whole engine's nomination gate sits ONCE for every
 * source (`surfaceableContact`): "Prashant's son" is not a person you can
 * message and a service row is not one Dhaga should volunteer, and previously
 * each source had to remember to exclude them separately. A candidate filtered
 * here is simply absent from the map, which the scorer already treats as
 * "stub or gone" — it is never suggested, and never hidden from People.
 */

export interface CandidateFacts {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  starred: boolean;
  everyDays: number | null;
  lastTouch: Date;
  degree: number;
}

/**
 * Degree as a CORRELATED SCALAR SUBSELECT, deliberately not a fourth join:
 * `lastTouchSql` already fans the row out across `notes` × `event_contacts`, and
 * joining `edges` alongside them would multiply those rows so every aggregate
 * (and the count itself) came back inflated.
 */
const degreeSql = sql<number>`(
  SELECT count(*)::int FROM edges e
  WHERE e.deleted_at IS NULL
    AND ((e.src_type = 'contact' AND e.src_id = ${contacts.id})
      OR (e.dst_type = 'contact' AND e.dst_id = ${contacts.id}))
)`;

/** Facts keyed by contact id; ids absent from the map are stubs or gone. */
export async function getCandidateFacts(ids: string[]): Promise<Map<string, CandidateFacts>> {
  if (ids.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({
      contactId: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      starred: contacts.starred,
      everyDays: contacts.reachOutEveryDays,
      lastTouch: lastTouchSql,
      degree: degreeSql,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    // lastTouchSql's join contract (see lib/repo/last-touch.ts): both touch
    // tables joined in, soft-deleted notes excluded, GROUP BY the contact.
    .leftJoin(notes, and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)))
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(and(inArray(contacts.id, ids), surfaceableContact))
    .groupBy(contacts.id, companies.id);
  return new Map(
    rows.map((row) => [
      row.contactId,
      { ...row, lastTouch: new Date(row.lastTouch), degree: Number(row.degree) },
    ]),
  );
}
