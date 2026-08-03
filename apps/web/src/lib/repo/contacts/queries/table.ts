import { and, count, desc, eq, ilike, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { TABLE_FILTER_OPTION_LIMIT } from "@/utils/constants/table";
import type { ContactListItem } from "./types";

// TODO(search-index): route through getSearchIndex() (needs paginated list support)
/** Deliberately still newest-CAPTURED first, unlike `listContacts`: the People
 *  table and the Saved tabs are browsable collections, and a stable created-at
 *  order is what makes their pagination reproducible between page loads. */
export async function listContactsPage({ page, pageSize, name, title, company, tag, starred, watched, kind }: {
  page: number;
  pageSize: number;
  name?: string;
  title?: string;
  company?: string;
  tag?: string;
  // The Saved page filters to one collection at a time: starred favourites or
  // watched (signal) contacts. Both reuse this one paginated query.
  starred?: boolean;
  watched?: boolean;
  // OPT-IN, and the only person_kind clause this browsable listing may carry:
  // it NARROWS to the rows suppressed from suggestions so the People header's
  // "N hidden from suggestions" link can show them. Omitted (the default) the
  // listing is unchanged and still lists services alongside everyone else —
  // People is a surface the user navigated to, so nothing is filtered out of
  // it (see lib/repo/contacts/surfaceable.ts).
  kind?: "service";
}): Promise<{ rows: ContactListItem[]; total: number }> {
  const db = await getDb();
  const conditions = [
    ne(contacts.source, "mentioned"),
    name ? ilike(contacts.name, `%${name}%`) : undefined,
    title ? eq(contacts.title, title) : undefined,
    company ? eq(companies.name, company) : undefined,
    tag ? sql`${contacts.tags} @> ${JSON.stringify([tag])}::jsonb` : undefined,
    starred ? eq(contacts.starred, true) : undefined,
    watched ? eq(contacts.watchedForSignals, true) : undefined,
    kind ? eq(contacts.personKind, kind) : undefined,
  ].filter((condition) => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const baseSelect = db.select({ id: contacts.id, name: contacts.name, title: contacts.title, companyName: companies.name, tags: contacts.tags, starred: contacts.starred, createdAt: contacts.createdAt }).from(contacts).leftJoin(companies, eq(contacts.companyId, companies.id)).where(where);
  const [rows, [totalRow]] = await Promise.all([
    baseSelect.orderBy(desc(contacts.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(contacts).leftJoin(companies, eq(contacts.companyId, companies.id)).where(where),
  ]);
  return { rows, total: totalRow?.value ?? 0 };
}

/**
 * How many contacts are currently kept off proactive surfaces — the People
 * header's "N hidden from suggestions" count. Suppression is only defensible if
 * the user can see it happening and undo it, so this number exists to be shown.
 * Counts exactly what `listContactsPage({ kind: "service" })` lists, so the
 * link it labels never lands on an empty page.
 */
export async function countServiceContacts(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ value: count() })
    .from(contacts)
    .where(and(ne(contacts.source, "mentioned"), eq(contacts.personKind, "service")));
  return row?.value ?? 0;
}

export async function listContactFilterOptions(): Promise<{ titles: string[]; companies: string[]; tags: string[] }> {
  const db = await getDb();
  const [titleRows, companyRows, tags] = await Promise.all([
    db.selectDistinct({ value: contacts.title }).from(contacts).where(sql`${contacts.title} is not null`).orderBy(contacts.title).limit(TABLE_FILTER_OPTION_LIMIT),
    db.selectDistinct({ value: companies.name }).from(companies).orderBy(companies.name).limit(TABLE_FILTER_OPTION_LIMIT),
    db.selectDistinct({ tag: sql<string>`jsonb_array_elements_text(${contacts.tags})` }).from(contacts).limit(TABLE_FILTER_OPTION_LIMIT),
  ]);
  return { titles: titleRows.flatMap((row) => row.value ? [row.value] : []), companies: companyRows.map((row) => row.value), tags: tags.map((row) => row.tag).sort() };
}

/** Distinct tags across all contacts (extraction writes them lowercase). */
export async function listAllTags(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.selectDistinct({ tag: sql<string>`jsonb_array_elements_text(${contacts.tags})` }).from(contacts);
  return rows.map((row) => row.tag).sort();
}
