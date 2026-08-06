import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";

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
