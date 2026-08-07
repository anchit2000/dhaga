import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions } from "@/lib/db/schema";
import { computePrimaryDenorm } from "../primary-position";
import { findOrCreateCompany } from "../write";

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
