import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  eventContacts,
  notes,
  positions,
  type ContactRow,
} from "@/lib/db/schema";
import { lastTouchSql } from "@/lib/repo/last-touch";
import { normalizeContactMethods } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";

/** A position joined to its company name, ordered for display. */
export interface PositionView {
  id: string;
  title: string | null;
  companyName: string | null;
  department: string | null;
  /** Affiliation predicate; null = plain employment. Education rows carry a
   *  studied_at / attended value so the detail page can group them separately. */
  relation: string | null;
  isCurrent: boolean;
  startedAt: string | null;
  endedAt: string | null;
  note: string | null;
}

export interface ContactDetail {
  contact: ContactRow;
  companyName: string | null;
  positions: PositionView[];
  /** Shared "last touch" (see `@/lib/repo/last-touch`) so the detail page's
   *  keep-in-touch badge agrees with Home's due feed instead of re-deriving a
   *  narrower definition. */
  lastTouch: Date;
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
    .select({ contact: contacts, companyName: companies.name, lastTouch: lastTouchSql })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    // lastTouchSql is an aggregate over these two touch tables (soft-deleted
    // notes excluded), so both joins and the GROUP BY are part of its contract.
    .leftJoin(
      notes,
      and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)),
    )
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(eq(contacts.id, id))
    .groupBy(contacts.id, companies.id)
    .limit(1);
  if (!row) return null;
  const positionRows = await db
    .select({
      id: positions.id,
      title: positions.title,
      companyName: companies.name,
      department: positions.department,
      relation: positions.relation,
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
    lastTouch: new Date(row.lastTouch),
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
      // Carry the affiliation predicate back into the editable profile so the
      // edit form can split existing rows into Experience vs Education.
      relation: p.relation,
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
