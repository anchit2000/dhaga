import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import {
  COMPANY_LEGAL_SUFFIXES,
  DUPLICATE_COMPANY_SCAN_LIMIT,
} from "@/utils/constants/companies";
import { companyWithCountColumns, type CompanyListItem } from "./queries";

export interface DuplicateCompanyCluster {
  normalizedName: string;
  companies: CompanyListItem[];
}

const SUFFIXES = new Set<string>(COMPANY_LEGAL_SUFFIXES);

/**
 * Canonical form for duplicate matching: lowercase, punctuation stripped, and
 * legal-entity suffixes (Inc/Ltd/GmbH/…) removed — so "Acme Inc." and "Acme"
 * collapse to the same key. Returns "" when nothing but a suffix remains (e.g.
 * a company literally named "LLC"); those are never clustered.
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !SUFFIXES.has(token))
    .join(" ")
    .trim();
}

/**
 * Group companies whose names match once normalised, returning only clusters of
 * 2+ (the actionable duplicates). Read-only. Scans up to
 * DUPLICATE_COMPANY_SCAN_LIMIT companies and throws past that rather than
 * silently grouping a subset (Rule 12) — a personal CRM never approaches it.
 */
export async function findDuplicateCompanyClusters(): Promise<DuplicateCompanyCluster[]> {
  const db = await getDb();
  const rows = await db
    .select(companyWithCountColumns)
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(companies.name)
    .limit(DUPLICATE_COMPANY_SCAN_LIMIT + 1);
  if (rows.length > DUPLICATE_COMPANY_SCAN_LIMIT) {
    throw new PreconditionError(
      `Too many companies to scan for duplicates (over ${DUPLICATE_COMPANY_SCAN_LIMIT}).`,
    );
  }
  const clusters = new Map<string, CompanyListItem[]>();
  for (const row of rows) {
    const key = normalizeCompanyName(row.name);
    if (!key) continue;
    const bucket = clusters.get(key);
    if (bucket) bucket.push(row);
    else clusters.set(key, [row]);
  }
  return [...clusters.entries()]
    .filter(([, group]) => group.length >= 2)
    .map(([normalizedName, group]) => ({ normalizedName, companies: group }));
}
