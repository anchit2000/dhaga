import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { signals } from "@/lib/db/schema";
import { createContact, forgetContact, getContact } from "@/lib/repo/contacts";
import { addNote, listNotes } from "@/lib/repo/notes";

const contactInput = {
  name: "Watchlist Person",
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

async function insertSignal(contactId: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(signals).values({
    id,
    contactId,
    kind: "job_change",
    headline: "Moved to a new company",
    detail: "Now VP of Sales at Acme, per their LinkedIn.",
    status: "new",
  });
  return id;
}

/**
 * `signals` (BRD §6.7 watchlist hits) has a real FK to contacts.id with no
 * onDelete: cascade — forgetContact never deleted from it, so Postgres
 * refused the final contacts delete with a foreign-key violation whenever a
 * watched contact had at least one signal row. The user's explicit "forget
 * this person" request (a GDPR erasure guarantee, CLAUDE.md) would fail.
 */
describe("forgetContact cascades to signals", () => {
  it("forgets a contact that has an active watchlist signal, and the signal is gone too", async () => {
    const id = await createContact(contactInput, "manual");
    const signalId = await insertSignal(id);

    await expect(forgetContact(id)).resolves.toBeUndefined();

    expect(await getContact(id)).toBeNull();
    const db = await getDb();
    const remaining = await db.select().from(signals).where(eq(signals.id, signalId));
    expect(remaining).toHaveLength(0);
  });
});

/**
 * The cascade is wrapped in one transaction specifically so a table this
 * function forgets to clean up (the exact shape of the signals bug above)
 * fails loud and leaves nothing behind, rather than silently deleting
 * notes/facts/embeddings and then dying on the final contacts delete —
 * which would strand a contact that's neither usable nor forgettable.
 * A throwaway table with an uncleaned FK to contacts.id stands in for
 * "some future table nobody remembered to add to forgetContact."
 */
describe("forgetContact is all-or-nothing", () => {
  it("rolls back the whole cascade when a later delete is blocked by an FK", async () => {
    const db = await getDb();
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS _test_unhandled_contact_ref (
        id text PRIMARY KEY,
        contact_id text NOT NULL REFERENCES contacts(id)
      )`,
    );
    try {
      const id = await createContact({ ...contactInput, name: "Rollback Person" }, "manual");
      const noteId = await addNote(id, "text", "should survive a failed forget");
      await db.execute(
        sql`INSERT INTO _test_unhandled_contact_ref (id, contact_id) VALUES (${randomUUID()}, ${id})`,
      );

      await expect(forgetContact(id)).rejects.toThrow();

      // Nothing was removed — the earlier deletes in the same cascade
      // (notes, facts, embeddings) rolled back along with the failed one,
      // instead of leaving a stripped, un-forgettable contact behind.
      expect(await getContact(id)).not.toBeNull();
      expect((await listNotes(id)).some((note) => note.id === noteId)).toBe(true);
    } finally {
      await db.execute(sql`DROP TABLE IF EXISTS _test_unhandled_contact_ref`);
    }
  });
});
