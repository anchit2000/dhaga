import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { normalizeContactMethods } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";

/**
 * The subset of a contact the merge dialog needs to (a) render the primary
 * picker, (b) compute per-field scalar conflicts (name/nickname/location) with
 * computeScalarConflicts, and (c) preview the unioned multi-value fields. Bare
 * legacy method strings are coerced to objects here so the client never sees
 * the two shapes.
 */
export interface ContactMergeRecord {
  id: string;
  name: string;
  nickname: string | null;
  location: string | null;
  title: string | null;
  companyName: string | null;
  emails: ContactMethod[];
  phones: ContactMethod[];
  links: ContactMethod[];
  tags: string[];
  starred: boolean;
  createdAt: Date;
}

/** Load the selected contacts for the merge dialog in ONE query (no getDb()
 *  fan-out). Order is oldest-first so the picker is stable across reloads. */
export async function getContactsForMerge(ids: string[]): Promise<ContactMergeRecord[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      nickname: contacts.nickname,
      location: contacts.location,
      title: contacts.title,
      companyName: companies.name,
      emails: contacts.emails,
      phones: contacts.phones,
      links: contacts.links,
      tags: contacts.tags,
      starred: contacts.starred,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(inArray(contacts.id, ids))
    .orderBy(contacts.createdAt);
  return rows.map((row) => ({
    ...row,
    emails: normalizeContactMethods(row.emails),
    phones: normalizeContactMethods(row.phones),
    links: normalizeContactMethods(row.links),
  }));
}
