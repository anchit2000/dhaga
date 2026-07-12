import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, type ContactRow } from "@/lib/db/schema";

export interface ContactListItem {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  tags: string[];
  createdAt: Date;
}

export interface ContactDetail {
  contact: ContactRow;
  companyName: string | null;
}

export async function listContacts(
  query?: string,
  tag?: string,
): Promise<ContactListItem[]> {
  const db = await getDb();
  const like = query?.trim() ? `%${query.trim()}%` : null;
  const conditions = [
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
  return db
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
}

/** Distinct tags across all contacts (extraction writes them lowercase). */
export async function listAllTags(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ tags: contacts.tags }).from(contacts);
  return [...new Set(rows.flatMap((row) => row.tags))].sort();
}

export async function getContact(id: string): Promise<ContactDetail | null> {
  const db = await getDb();
  const [row] = await db
    .select({ contact: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, id))
    .limit(1);
  return row ?? null;
}
