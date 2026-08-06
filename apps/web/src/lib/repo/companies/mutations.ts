import { randomUUID } from "node:crypto";
import { and, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, edges, followUps, positions } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";

/**
 * Create a company, de-duplicating on a case-insensitive name so two callers —
 * or a user re-typing an existing employer — never fork one company into two
 * rows. Mirrors findOrCreateCompany's advisory-lock + ILIKE dedupe
 * (contacts/write.ts); re-implemented rather than called because this path also
 * sets domain/sector on the NEW row and must NOT clobber those on an existing
 * match (dedupe returns the existing id untouched). The xact advisory lock
 * serialises concurrent callers for the same name without a schema-level unique
 * constraint (which would break self-hosts that already carry duplicate names).
 */
export async function createCompany(input: {
  name: string;
  domain?: string | null;
  sector?: string | null;
}): Promise<{ id: string }> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new PreconditionError("Give the company a name.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${trimmed.toLowerCase()}))`);
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(ilike(companies.name, trimmed))
      .limit(1);
    if (existing) return { id: existing.id };
    const id = randomUUID();
    await tx.insert(companies).values({
      id,
      name: trimmed,
      domain: input.domain?.trim() || null,
      sector: input.sector?.trim() || null,
    });
    return { id };
  });
}

/** Update a company's identity. An omitted (undefined) domain/sector key is left
 *  untouched; an explicit null/empty clears the field. Rejects an empty name. */
export async function renameCompany(
  id: string,
  input: { name: string; domain?: string | null; sector?: string | null },
): Promise<void> {
  const trimmed = input.name.trim();
  if (!trimmed) throw new PreconditionError("Give the company a name.");
  const db = await getDb();
  const updated = await db
    .update(companies)
    .set({
      name: trimmed,
      ...(input.domain !== undefined ? { domain: input.domain?.trim() || null } : {}),
      ...(input.sector !== undefined ? { sector: input.sector?.trim() || null } : {}),
    })
    .where(eq(companies.id, id))
    .returning({ id: companies.id });
  if (updated.length === 0) throw new PreconditionError("Company not found.");
}

/**
 * Delete a company without destroying the people or jobs attached to it.
 * contacts.company_id and positions.company_id are RESTRICT FKs, so a bare
 * DELETE would throw — instead DETACH both (NULL the link, keeping the contact
 * and the job title/history intact) and soft-delete the company's graph edges
 * (matching how deleteEntity retires an entity's edges), then remove the row.
 * One transaction: every statement is a pure DB write, so a mid-cascade failure
 * can't strand a half-detached company.
 */
export async function deleteCompany(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);
    if (!existing) throw new PreconditionError("Company not found.");
    await tx.update(contacts).set({ companyId: null }).where(eq(contacts.companyId, id));
    await tx.update(positions).set({ companyId: null }).where(eq(positions.companyId, id));
    await tx.update(followUps).set({ companyId: null }).where(eq(followUps.companyId, id));
    await tx
      .update(edges)
      .set({ deletedAt: now })
      .where(
        and(
          isNull(edges.deletedAt),
          or(
            and(eq(edges.srcType, "company"), eq(edges.srcId, id)),
            and(eq(edges.dstType, "company"), eq(edges.dstId, id)),
          ),
        ),
      );
    await tx.delete(companies).where(eq(companies.id, id));
  });
}
