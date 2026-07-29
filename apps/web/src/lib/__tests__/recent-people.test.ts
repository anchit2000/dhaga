import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact, listContacts, listContactsPage } from "@/lib/repo/contacts";
import { addNote, deleteNote } from "@/lib/repo/notes";
import { markReachedOut } from "@/lib/repo/reminders";
import { emptyExtractedContact } from "@dhaga/core";

/** Shift a contact's creation (its baseline touch) into the past. */
async function backdateContact(id: string, days: number): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ createdAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(contacts.id, id));
}

function rankOf(rows: { id: string }[], id: string): number {
  return rows.findIndex((row) => row.id === id);
}

/**
 * Home's "Recent people" answers "who is on my mind right now", not "who did I
 * type in last" — so `listContacts` ranks by LAST TOUCH (capture, note, event
 * scan, reach-out) and labels each row with the reason. The People table and
 * the Saved tabs are browsable collections instead, so they must keep their
 * stable newest-captured order.
 */
describe("recent people ranking", () => {
  it("a note outranks a newer capture — activity beats data-entry order", async () => {
    const noted = await createContact(
      { ...emptyExtractedContact(), name: "Noted Nadia" },
      "manual",
    );
    await backdateContact(noted, 10);
    const fresh = await createContact(
      { ...emptyExtractedContact(), name: "Fresh Farid" },
      "manual",
    );

    const rows = await listContacts();
    // Baseline: with no activity, capture order still decides.
    expect(rankOf(rows, fresh)).toBeLessThan(rankOf(rows, noted));

    await addNote(noted, "text", "caught up over coffee");

    const afterNote = await listContacts();
    expect(rankOf(afterNote, noted)).toBeLessThan(rankOf(afterNote, fresh));
  });

  it("a soft-deleted note is not a touch — deleting it must give back the old ranking", async () => {
    const noted = await createContact(
      { ...emptyExtractedContact(), name: "Tombstone Tara" },
      "manual",
    );
    await backdateContact(noted, 10);
    const fresh = await createContact(
      { ...emptyExtractedContact(), name: "Recent Ravi" },
      "manual",
    );
    const noteId = await addNote(noted, "text", "met at the meetup");
    expect(rankOf(await listContacts(), noted)).toBe(0);

    await deleteNote(noteId);

    // WHY: a tombstoned note's content is gone from the product, so the
    // interaction it recorded must stop counting too — otherwise a deleted note
    // silently keeps someone pinned to the top of Home forever.
    const rows = await listContacts();
    expect(rankOf(rows, fresh)).toBeLessThan(rankOf(rows, noted));
    expect(rows.find((row) => row.id === noted)?.reason).toBe("added");
  });

  it("tags the reason: 'added' until something happens, then 'interacted'", async () => {
    const id = await createContact(
      { ...emptyExtractedContact(), name: "Reason Rhea" },
      "manual",
    );
    await backdateContact(id, 3);

    // WHY: the badge is the row's justification for being on Home. Claiming
    // an interaction for someone you only typed in would be fabricated.
    expect((await listContacts()).find((row) => row.id === id)?.reason).toBe("added");

    await addNote(id, "text", "long chat about their new role");
    expect((await listContacts()).find((row) => row.id === id)?.reason).toBe("interacted");
  });

  it("reaching out is an interaction too — the badge must not still say 'added'", async () => {
    const id = await createContact(
      { ...emptyExtractedContact(), name: "Reachout Ritu" },
      "manual",
    );
    await backdateContact(id, 3);
    await markReachedOut(id);

    // WHY: a reach-out lifts the row up the list (it is a term of lastTouchSql),
    // so a reason that ignored it would misexplain the rank — the badge would
    // read "recently added" for someone who rose because you contacted them.
    expect((await listContacts()).find((row) => row.id === id)?.reason).toBe("interacted");
  });

  it("a contact with several notes appears exactly once", async () => {
    const id = await createContact(
      { ...emptyExtractedContact(), name: "Chatty Chandan" },
      "manual",
    );
    await addNote(id, "text", "first chat");
    await addNote(id, "text", "second chat");

    // WHY: ordering by last touch means joining notes, which fans out one row
    // per note. Without the grouping, Home's five-row preview would be one
    // person repeated.
    const rows = await listContacts();
    expect(rows.filter((row) => row.id === id)).toHaveLength(1);
  });

  it("the People/Saved pagination stays newest-captured first, notes or not", async () => {
    const older = await createContact(
      { ...emptyExtractedContact(), name: "Paged Priya" },
      "manual",
    );
    await backdateContact(older, 10);
    const newer = await createContact(
      { ...emptyExtractedContact(), name: "Paged Pankaj" },
      "manual",
    );
    await addNote(older, "text", "spoke yesterday");

    // WHY: a browsable, paginated table must not reshuffle under the user as
    // notes land — only Home's recency tile re-ranks.
    const { rows } = await listContactsPage({ page: 1, pageSize: 25, name: "Paged " });
    expect(rankOf(rows, newer)).toBeLessThan(rankOf(rows, older));
  });
});
