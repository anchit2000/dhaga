import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";

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
