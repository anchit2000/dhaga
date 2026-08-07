import { randomUUID } from "node:crypto";
import { normalizeContactMethods } from "@dhaga/core";
import type { ContactProfile, Position } from "@dhaga/core";
import { findOrCreateCompany } from "./company";

export type ResolvedPosition = { position: Position; companyId: string | null };

/** Resolve each position's company to a companies row. SEQUENTIAL, not
 *  Promise.all: findOrCreateCompany opens its own connection+transaction, so a
 *  concurrent fan-out checked out one tenant-pool connection per position and a
 *  multi-job contact exhausted the max-3 pool (a server action gets no React
 *  cache() getDb() dedupe). The name→id memo collapses repeat companies. */
export async function resolvePositions(list: Position[]): Promise<ResolvedPosition[]> {
  const byName = new Map<string, string | null>();
  const out: ResolvedPosition[] = [];
  for (const position of list) {
    const name = position.company?.trim();
    if (name && !byName.has(name)) byName.set(name, await findOrCreateCompany(name));
    out.push({ position, companyId: name ? byName.get(name) ?? null : null });
  }
  return out;
}

/** Contact-row values from a profile. The primary position (first current,
 *  else the first listed) mirrors into the denormalised title/company_id. */
export function contactValues(input: ContactProfile, resolved: ResolvedPosition[]) {
  const current = input.positions.findIndex((p) => p.current);
  const primaryIndex = current >= 0 ? current : input.positions.length > 0 ? 0 : -1;
  const primary = primaryIndex >= 0 ? input.positions[primaryIndex] : null;
  return {
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    title: primary?.title?.trim() || null,
    companyId: primaryIndex >= 0 ? resolved[primaryIndex].companyId : null,
    emails: normalizeContactMethods(input.emails),
    phones: normalizeContactMethods(input.phones),
    links: normalizeContactMethods(input.links),
    addresses: input.addresses,
    importantDates: input.importantDates,
    customFields: input.customFields,
    location: input.location?.trim() || null,
    updatedAt: new Date(),
  };
}

export function positionRows(contactId: string, resolved: ResolvedPosition[]) {
  return resolved.map(({ position, companyId }, index) => ({
    id: randomUUID(),
    contactId,
    companyId,
    title: position.title?.trim() || null,
    department: position.department?.trim() || null,
    // Education/affiliation predicate for this row; null = plain employment
    // (affiliationPredicate() derives works_at/worked_at from isCurrent).
    relation: position.relation ?? null,
    isCurrent: position.current,
    startedAt: position.startedAt?.trim() || null,
    endedAt: position.endedAt?.trim() || null,
    note: position.note?.trim() || null,
    sortOrder: index,
  }));
}
