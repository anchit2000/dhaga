import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, companyAliases, contacts } from "@/lib/db/schema";
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
  // Alias names are additional cluster keys, so a company known by another's
  // name (an acquisition, a prior name) groups with it. One query — no per-
  // company fan-out.
  const aliasRows = await db
    .select({ companyId: companyAliases.companyId, alias: companyAliases.alias })
    .from(companyAliases);
  const aliasesByCompany = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = aliasesByCompany.get(row.companyId);
    if (list) list.push(row.alias);
    else aliasesByCompany.set(row.companyId, [row.alias]);
  }
  // key → (companyId → row): the inner Map dedupes a company that reaches the
  // same key by several of its names, preserving the query's name ordering.
  const clusters = new Map<string, Map<string, CompanyListItem>>();
  function addKey(key: string, row: CompanyListItem): void {
    if (!key) return;
    let bucket = clusters.get(key);
    if (!bucket) {
      bucket = new Map();
      clusters.set(key, bucket);
    }
    bucket.set(row.id, row);
  }
  for (const row of rows) {
    addKey(normalizeCompanyName(row.name), row);
    for (const alias of aliasesByCompany.get(row.id) ?? []) {
      addKey(normalizeCompanyName(alias), row);
    }
  }
  return [...clusters.entries()]
    .map(([normalizedName, byId]) => ({ normalizedName, companies: [...byId.values()] }))
    .filter((cluster) => cluster.companies.length >= 2);
}
