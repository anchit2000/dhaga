import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { findOrCreateCompany } from "./write";

/**
 * Force-set every listed contact's company, overwriting whatever was there.
 * Used by a manually confirmed "Create group" (People page) — unlike
 * addContactsToCompany this skips `positions` entirely and repoints the
 * denormalised company_id directly (the same shortcut linkClusterToCompany
 * uses, minus its fill-empty gate), so the result is deterministic: every
 * selected contact ends up at this company, never left at whichever
 * position happened to sort first.
 */
export async function setContactsCompany(
  contactIds: string[],
  companyName: string,
): Promise<number> {
  const companyId = await findOrCreateCompany(companyName);
  if (contactIds.length === 0) return 0;
  const db = await getDb();
  const updated = await db
    .update(contacts)
    .set({ companyId, updatedAt: new Date() })
    .where(inArray(contacts.id, contactIds))
    .returning({ id: contacts.id });
  return updated.length;
}

/** Force-set every listed contact's location, overwriting whatever was there. */
export async function setContactsLocation(
  contactIds: string[],
  location: string,
): Promise<number> {
  if (contactIds.length === 0) return 0;
  const db = await getDb();
  const updated = await db
    .update(contacts)
    .set({ location, updatedAt: new Date() })
    .where(inArray(contacts.id, contactIds))
    .returning({ id: contacts.id });
  return updated.length;
}
