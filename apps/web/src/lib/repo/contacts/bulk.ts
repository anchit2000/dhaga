import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";
import { cascadeForget } from "./mutations";
import { computePrimaryDenorm } from "./primary-position";
import { findOrCreateCompany } from "./write";

/** Bulk toggle the explicit "starred" favourite on many contacts in one UPDATE. */
export async function setContactsStarred(ids: string[], starred: boolean): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.update(contacts).set({ starred }).where(inArray(contacts.id, ids));
}

/** Add a tag to every listed contact that doesn't already carry it. Reads the
 *  affected rows ONCE, then updates each within one transaction — never a
 *  per-row getDb() fan-out (which exhausts the small tenant pool). */
export async function addTagToContacts(ids: string[], tag: string): Promise<void> {
  const trimmed = tag.trim();
  if (!trimmed || ids.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: contacts.id, tags: contacts.tags })
      .from(contacts)
      .where(inArray(contacts.id, ids));
    for (const row of rows) {
      if (row.tags.includes(trimmed)) continue;
      await tx
        .update(contacts)
        .set({ tags: [...row.tags, trimmed], updatedAt: new Date() })
        .where(eq(contacts.id, row.id));
    }
  });
}

/** Remove a tag from every listed contact that carries it — same single-scan,
 *  single-transaction shape as addTagToContacts. */
export async function removeTagFromContacts(ids: string[], tag: string): Promise<void> {
  const trimmed = tag.trim();
  if (!trimmed || ids.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: contacts.id, tags: contacts.tags })
      .from(contacts)
      .where(inArray(contacts.id, ids));
    for (const row of rows) {
      if (!row.tags.includes(trimmed)) continue;
      await tx
        .update(contacts)
        .set({ tags: row.tags.filter((existing) => existing !== trimmed), updatedAt: new Date() })
        .where(eq(contacts.id, row.id));
    }
  });
}

/**
 * Relabel the affiliation predicate (studied_at, interned_at, worked_at, …) on
 * many contacts' positions at one company — each contact's own current company
 * (mode "current") or one shared company (mode "company"). Same single-scan,
 * single-transaction shape as addTagToContacts (resolve targets in ONE read,
 * then one UPDATE per contact inside a single transaction — no getDb() fan-out).
 * Only `relation` changes; the denormalised title/company_id are untouched.
 * Returns the number of contacts whose position(s) were actually updated.
 */
export async function setContactsAffiliation(
  contactIds: string[],
  target: { mode: "current" } | { mode: "company"; companyId: string },
  relation: string,
): Promise<number> {
  const value = relation.trim();
  if (!value || contactIds.length === 0) return 0;
  const db = await getDb();
  const targetCompany = new Map<string, string>();
  if (target.mode === "company") {
    for (const id of contactIds) targetCompany.set(id, target.companyId);
  } else {
    const rows = await db
      .select({ id: contacts.id, companyId: contacts.companyId })
      .from(contacts)
      .where(inArray(contacts.id, contactIds));
    for (const row of rows) {
      if (row.companyId) targetCompany.set(row.id, row.companyId);
    }
  }

  let affected = 0;
  await db.transaction(async (tx) => {
    for (const [contactId, companyId] of targetCompany) {
      const updated = await tx
        .update(positions)
        .set({ relation: value })
        .where(and(eq(positions.contactId, contactId), eq(positions.companyId, companyId)))
        .returning({ id: positions.id });
      if (updated.length > 0) affected += 1;
    }
  });
  return affected;
}

/** Forget many contacts — the full forgetContact cascade for each, in ONE
 *  transaction so the batch is all-or-nothing (a later failure can't leave a
 *  half-deleted contact behind). */
export async function forgetContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const id of ids) await cascadeForget(tx, id);
  });
}

/**
 * Add many contacts to a company. Resolve the company by name ONCE up front
 * (findOrCreateCompany owns its advisory-lock dedupe transaction), then in one
 * transaction give each contact a new current position there — skipping any
 * that already have a current role at that company — and recompute the
 * denormalised title/company_id via the primary-position rule. Sequential
 * inside the single transaction: never a per-contact getDb() fan-out.
 */
export async function addContactsToCompany(
  contactIds: string[],
  companyName: string,
): Promise<{ companyId: string }> {
  const companyId = await findOrCreateCompany(companyName);
  if (contactIds.length === 0) return { companyId };
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const contactId of contactIds) {
      const existing = await tx
        .select({ id: positions.id })
        .from(positions)
        .where(
          and(
            eq(positions.contactId, contactId),
            eq(positions.companyId, companyId),
            eq(positions.isCurrent, true),
          ),
        )
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(positions).values({
          id: randomUUID(),
          contactId,
          companyId,
          title: null,
          isCurrent: true,
          sortOrder: 0,
        });
      }
      const denorm = await computePrimaryDenorm(tx, contactId);
      await tx.update(contacts).set({ ...denorm, updatedAt: new Date() }).where(eq(contacts.id, contactId));
    }
  });
  return { companyId };
}
