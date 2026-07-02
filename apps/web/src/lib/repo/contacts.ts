import { randomUUID } from "node:crypto";
import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { companies, contacts, type ContactRow } from "@/lib/db/schema";
import type { ExtractedContact } from "@dhaga/core";
import type { ContactSource } from "@/utils/constants/app";

export interface ContactListItem {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  createdAt: Date;
}

export interface ContactDetail {
  contact: ContactRow;
  companyName: string | null;
}

export async function listContacts(query?: string): Promise<ContactListItem[]> {
  const db = await getDb();
  const like = query?.trim() ? `%${query.trim()}%` : null;
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      like
        ? or(
            ilike(contacts.name, like),
            ilike(contacts.title, like),
            ilike(companies.name, like),
          )
        : undefined,
    )
    .orderBy(desc(contacts.createdAt));
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

export async function findOrCreateCompany(name: string): Promise<string> {
  const db = await getDb();
  const trimmed = name.trim();
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(ilike(companies.name, trimmed))
    .limit(1);
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(companies).values({ id, name: trimmed });
  return id;
}

export async function createContact(
  input: ExtractedContact,
  source: ContactSource,
): Promise<string> {
  const db = await getDb();
  const companyId = input.company?.trim()
    ? await findOrCreateCompany(input.company)
    : null;
  const id = randomUUID();
  await db.insert(contacts).values({
    id,
    name: input.name.trim(),
    title: input.title?.trim() || null,
    companyId,
    emails: input.emails,
    phones: input.phones,
    links: input.links,
    location: input.location?.trim() || null,
    tags: [],
    source,
  });
  return id;
}
