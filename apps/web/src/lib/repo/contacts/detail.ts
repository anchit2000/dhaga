import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, positions, type ContactRow } from "@/lib/db/schema";
import { normalizeContactMethods } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";

/** A position joined to its company name, ordered for display. */
export interface PositionView {
  id: string;
  title: string | null;
  companyName: string | null;
  department: string | null;
  isCurrent: boolean;
  startedAt: string | null;
  endedAt: string | null;
  note: string | null;
}

export interface ContactDetail {
  contact: ContactRow;
  companyName: string | null;
  positions: PositionView[];
}

/**
 * Load a contact for the detail page: the row (with its emails/phones/links
 * coerced to labeled objects — legacy string rows are normalised here so
 * nothing downstream has to know the column ever held bare strings) plus its
 * full employment history joined to company names.
 */
export async function getContact(id: string): Promise<ContactDetail | null> {
  const db = await getDb();
  const [row] = await db
    .select({ contact: contacts, companyName: companies.name })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, id))
    .limit(1);
  if (!row) return null;
  const positionRows = await db
    .select({
      id: positions.id,
      title: positions.title,
      companyName: companies.name,
      department: positions.department,
      isCurrent: positions.isCurrent,
      startedAt: positions.startedAt,
      endedAt: positions.endedAt,
      note: positions.note,
    })
    .from(positions)
    .leftJoin(companies, eq(positions.companyId, companies.id))
    .where(eq(positions.contactId, id))
    .orderBy(positions.sortOrder);
  return {
    contact: {
      ...row.contact,
      emails: normalizeContactMethods(row.contact.emails),
      phones: normalizeContactMethods(row.contact.phones),
      links: normalizeContactMethods(row.contact.links),
    },
    companyName: row.companyName,
    positions: positionRows,
  };
}

/** The same contact in the editable profile shape the add/edit form uses. */
export async function getContactProfile(id: string): Promise<ContactProfile | null> {
  const detail = await getContact(id);
  if (!detail) return null;
  const c = detail.contact;
  return {
    name: c.name,
    nickname: c.nickname ?? null,
    positions: detail.positions.map((p) => ({
      title: p.title,
      company: p.companyName,
      department: p.department,
      current: p.isCurrent,
      startedAt: p.startedAt,
      endedAt: p.endedAt,
      note: p.note,
    })),
    emails: normalizeContactMethods(c.emails),
    phones: normalizeContactMethods(c.phones),
    links: normalizeContactMethods(c.links),
    addresses: Array.isArray(c.addresses) ? c.addresses : [],
    importantDates: Array.isArray(c.importantDates) ? c.importantDates : [],
    customFields: Array.isArray(c.customFields) ? c.customFields : [],
    location: c.location,
  };
}
