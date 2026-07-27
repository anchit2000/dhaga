import { count, eq, ilike, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";

export interface CompanyListItem {
  id: string;
  name: string;
  domain: string | null;
  sector: string | null;
  contactCount: number;
  createdAt: Date;
}

/** The merge dialog's primary picker + conflict computation read the same shape
 *  as a list row (id/name/domain/sector/contactCount/createdAt); aliased for
 *  call-site clarity rather than duplicated. */
export type CompanyMergeRecord = CompanyListItem;

/** Shared projection: a company row plus a live headcount of the contacts
 *  pointing at it. Every list/merge read below groups by companies.id so the
 *  COUNT is one grouped query, never an N+1 per-company lookup. Callers must
 *  leftJoin(contacts) and groupBy(companies.id). */
export const companyWithCountColumns = {
  id: companies.id,
  name: companies.name,
  domain: companies.domain,
  sector: companies.sector,
  contactCount: count(contacts.id),
  createdAt: companies.createdAt,
};

/** Server-paginated company list with per-row contact counts. One query for the
 *  page (grouped count), one for the total — a single scoped connection, never a
 *  getDb() fan-out across the small tenant pool. */
export async function listCompaniesPage({ page, pageSize, name }: {
  page: number;
  pageSize: number;
  name?: string;
}): Promise<{ rows: CompanyListItem[]; total: number }> {
  const db = await getDb();
  const where = name?.trim() ? ilike(companies.name, `%${name.trim()}%`) : undefined;
  const [rows, [totalRow]] = await Promise.all([
    db
      .select(companyWithCountColumns)
      .from(companies)
      .leftJoin(contacts, eq(contacts.companyId, companies.id))
      .where(where)
      .groupBy(companies.id)
      .orderBy(companies.name)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(companies).where(where),
  ]);
  return { rows, total: totalRow?.value ?? 0 };
}

/** The records the merge dialog needs for the chosen ids — one grouped query. */
export async function getCompaniesForMerge(ids: string[]): Promise<CompanyMergeRecord[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .select(companyWithCountColumns)
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .where(inArray(companies.id, ids))
    .groupBy(companies.id)
    .orderBy(companies.name);
}
