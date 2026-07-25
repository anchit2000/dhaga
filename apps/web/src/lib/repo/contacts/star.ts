import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";

/**
 * Toggle a contact's explicit "starred" favourite. Distinct from
 * watchedForSignals (proactive signal scans) — starring is a manual bookmark
 * that powers the Saved page's Starred tab and the home Starred tile.
 */
export async function setStarred(contactId: string, starred: boolean): Promise<void> {
  const db = await getDb();
  await db.update(contacts).set({ starred }).where(eq(contacts.id, contactId));
}
