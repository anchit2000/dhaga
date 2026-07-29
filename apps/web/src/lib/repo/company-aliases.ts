import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, companyAliases, type CompanyAliasRow } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import type { DhagaDb } from "@/lib/db";

/**
 * Server-side CRUD for a company's alternate names. Per-user uniqueness is
 * enforced here (lookup-then-insert), not a DB constraint — mirrors voice_vocab.
 * One getDb() per call (never in a Promise.all) avoids the scoped-pool fan-out
 * trap. An alias resolves a company at capture time and keys duplicate detection.
 */

/** One alias plus its company's name for the global view. `id` is included
 *  (beyond the mapping the spec named) so the page can edit/delete each row. */
export interface AliasMappingRow {
  id: string;
  alias: string;
  companyId: string;
  companyName: string;
}

/** Every alias of one company, alphabetical. */
export async function listAliases(companyId: string): Promise<CompanyAliasRow[]> {
  const db = await getDb();
  return db.select().from(companyAliases).where(eq(companyAliases.companyId, companyId)).orderBy(companyAliases.alias);
}

/** Every alias across the user's companies, ordered by company name then alias. */
export async function listAllAliases(): Promise<AliasMappingRow[]> {
  const db = await getDb();
  return db
    .select({
      id: companyAliases.id,
      alias: companyAliases.alias,
      companyId: companyAliases.companyId,
      companyName: companies.name,
    })
    .from(companyAliases)
    .innerJoin(companies, eq(companies.id, companyAliases.companyId))
    .orderBy(companies.name, companyAliases.alias);
}

/** Case-insensitive alias→company lookup for capture-time resolution. The DDL's
 *  lower(alias) index serves this equality. */
export async function resolveCompanyByAlias(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const db = await getDb();
  const [row] = await db.select({ companyId: companyAliases.companyId }).from(companyAliases)
    .where(sql`lower(${companyAliases.alias}) = ${trimmed.toLowerCase()}`).limit(1);
  return row?.companyId ?? null;
}

/** Reject a blank alias, the target company's own name, or a name already taken
 *  by any of the user's aliases (case-insensitive). `excludeId` skips the row
 *  being renamed so a case-only rewrite of itself is allowed. */
async function assertAliasUsable(
  db: DhagaDb,
  companyId: string,
  lc: string,
  excludeId?: string,
): Promise<void> {
  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) throw new PreconditionError("Company not found.");
  if (company.name.trim().toLowerCase() === lc) {
    throw new PreconditionError("That's already the company's name.");
  }
  const [dupe] = await db
    .select({ id: companyAliases.id })
    .from(companyAliases)
    .where(sql`lower(${companyAliases.alias}) = ${lc}`)
    .limit(1);
  if (dupe && dupe.id !== excludeId) throw new PreconditionError("That alias already exists.");
}

/** Add one alias to a company. */
export async function addAlias(companyId: string, alias: string): Promise<void> {
  const trimmed = alias.trim();
  if (!trimmed) throw new PreconditionError("Give the alias a name.");
  const db = await getDb();
  await assertAliasUsable(db, companyId, trimmed.toLowerCase());
  await db.insert(companyAliases).values({ id: randomUUID(), companyId, alias: trimmed });
}

/** Rename one alias, applying the same uniqueness rules as addAlias. */
export async function updateAlias(id: string, alias: string): Promise<void> {
  const trimmed = alias.trim();
  if (!trimmed) throw new PreconditionError("Give the alias a name.");
  const db = await getDb();
  const [row] = await db
    .select({ companyId: companyAliases.companyId })
    .from(companyAliases)
    .where(eq(companyAliases.id, id))
    .limit(1);
  if (!row) throw new PreconditionError("Alias not found.");
  await assertAliasUsable(db, row.companyId, trimmed.toLowerCase(), id);
  await db.update(companyAliases).set({ alias: trimmed }).where(eq(companyAliases.id, id));
}

/** Remove one alias. */
export async function removeAlias(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(companyAliases).where(eq(companyAliases.id, id));
}

/**
 * Insert `aliases` as aliases of `companyId` in the caller's transaction — merge
 * uses it to fold losing names in. Skips any equal to the survivor's name or an
 * existing alias and dedupes the batch case-insensitively; reads the survivor's
 * name from `tx` (apply a new resolved name first). Per-survivor uniqueness only
 * (not addAlias's global rule), so a bulk fold never fails the merge on a clash.
 */
export async function addAliasesInTx(
  tx: DhagaDb,
  companyId: string,
  aliases: string[],
): Promise<void> {
  const candidates = aliases.map((alias) => alias.trim()).filter((alias) => alias.length > 0);
  if (candidates.length === 0) return;
  const [company] = await tx
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) return;
  const existing = await tx
    .select({ alias: companyAliases.alias })
    .from(companyAliases)
    .where(eq(companyAliases.companyId, companyId));
  const taken = new Set<string>([
    company.name.trim().toLowerCase(),
    ...existing.map((row) => row.alias.trim().toLowerCase()),
  ]);
  const values: Array<typeof companyAliases.$inferInsert> = [];
  for (const alias of candidates) {
    const lc = alias.toLowerCase();
    if (taken.has(lc)) continue;
    taken.add(lc);
    values.push({ id: randomUUID(), companyId, alias });
  }
  if (values.length > 0) await tx.insert(companyAliases).values(values);
}
