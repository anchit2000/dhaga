import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { TABLE_FILTER_OPTION_LIMIT } from "@/utils/constants/table";

export interface ContactListItem {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  tags: string[];
  createdAt: Date;
}

export interface ContactIdentityCandidate {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
}

export async function findContactIdentityCandidates(
  rawText: string,
): Promise<ContactIdentityCandidate[]> {
  const names = [
    ...new Set(
      rawText
        .normalize("NFC")
        .match(/\b\p{Lu}[\p{L}'-]{2,}\b/gu)
        ?.filter((word) => !["The", "This", "That", "Met", "Has", "Had", "His", "Her"].includes(word)) ?? [],
    ),
  ].slice(0, 8);
  if (names.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        ne(contacts.source, "mentioned"),
        or(...names.map((name) => ilike(contacts.name, `${name}%`))),
      ),
    )
    .limit(20);
  const normalized = rawText.toLocaleLowerCase();
  const fullNameMatches = rows.filter((row) =>
    normalized.includes(row.name.toLocaleLowerCase()),
  );
  if (fullNameMatches.length === 1) return [];
  if (fullNameMatches.length > 1) return fullNameMatches;
  const ambiguousFirstName = names.find(
    (name) =>
      rows.filter((row) => row.name.toLocaleLowerCase().startsWith(`${name.toLocaleLowerCase()} `) || row.name.toLocaleLowerCase() === name.toLocaleLowerCase()).length > 1,
  );
  return ambiguousFirstName
    ? rows.filter((row) =>
        row.name.toLocaleLowerCase().startsWith(`${ambiguousFirstName.toLocaleLowerCase()} `) ||
        row.name.toLocaleLowerCase() === ambiguousFirstName.toLocaleLowerCase(),
      )
    : [];
}

export async function listMentionMergeCandidates(
  mentionId: string,
  name: string,
): Promise<ContactIdentityCandidate[]> {
  const db = await getDb();
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(
      and(
        ne(contacts.id, mentionId),
        ne(contacts.source, "mentioned"),
        ilike(contacts.name, `%${firstName}%`),
      ),
    )
    .orderBy(contacts.name)
    .limit(10);
}

export async function listContacts(
  query?: string,
  tag?: string,
  limit?: number,
): Promise<ContactListItem[]> {
  const db = await getDb();
  const like = query?.trim() ? `%${query.trim()}%` : null;
  const conditions = [
    ne(contacts.source, "mentioned"),
    like
      ? or(
          ilike(contacts.name, like),
          ilike(contacts.title, like),
          ilike(companies.name, like),
        )
      : undefined,
    tag?.trim()
      ? sql`${contacts.tags} @> ${JSON.stringify([tag.trim()])}::jsonb`
      : undefined,
  ].filter((condition) => condition !== undefined);
  const result = db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      tags: contacts.tags,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contacts.createdAt));
  return limit ? result.limit(limit) : result;
}

export async function listContactsPage({ page, pageSize, name, title, company, tag }: {
  page: number;
  pageSize: number;
  name?: string;
  title?: string;
  company?: string;
  tag?: string;
}): Promise<{ rows: ContactListItem[]; total: number }> {
  const db = await getDb();
  const conditions = [
    name ? ilike(contacts.name, `%${name}%`) : undefined,
    title ? eq(contacts.title, title) : undefined,
    company ? eq(companies.name, company) : undefined,
    tag ? sql`${contacts.tags} @> ${JSON.stringify([tag])}::jsonb` : undefined,
  ].filter((condition) => condition !== undefined);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const baseSelect = db.select({ id: contacts.id, name: contacts.name, title: contacts.title, companyName: companies.name, tags: contacts.tags, createdAt: contacts.createdAt }).from(contacts).leftJoin(companies, eq(contacts.companyId, companies.id)).where(where);
  const [rows, [totalRow]] = await Promise.all([
    baseSelect.orderBy(desc(contacts.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(contacts).leftJoin(companies, eq(contacts.companyId, companies.id)).where(where),
  ]);
  return { rows, total: totalRow?.value ?? 0 };
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
