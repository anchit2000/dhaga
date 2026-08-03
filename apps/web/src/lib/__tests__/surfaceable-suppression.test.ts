import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import {
  countServiceContacts,
  createContact,
  listContactsPage,
  setPersonKind,
} from "@/lib/repo/contacts";
import { listDueReachOuts, setCadence } from "@/lib/repo/reminders";
import { emptyExtractedContact } from "@dhaga/core";

/** Push the contact's baseline touch (its creation) far enough back that any
 *  cadence is overdue. */
async function backdate(id: string, days: number): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ createdAt: sql`now() - make_interval(days => ${days})` })
    .where(eq(contacts.id, id));
}

async function createOverdue(name: string): Promise<string> {
  const id = await createContact({ ...emptyExtractedContact(), name }, "manual");
  await backdate(id, 90);
  await setCadence(id, 7);
  return id;
}

/**
 * The one rule the whole person/service feature rests on: a service row is
 * never NOMINATED on a proactive surface, and is ALWAYS still findable. These
 * tests fail the moment either half breaks — the suppression silently stops
 * working, or it leaks into a list the user navigated to on purpose (which is
 * an invisible, unappealable hide, i.e. a bug, not the feature).
 */
describe("person_kind suppression", () => {
  it("keeps a service row out of the cadence feed while leaving it in People", async () => {
    const id = await createOverdue("Vegetable Vendor Suppression");
    // Baseline: before any ruling, this row IS a legitimate nomination.
    expect((await listDueReachOuts()).some((row) => row.id === id)).toBe(true);

    await setPersonKind(id, "service");

    expect((await listDueReachOuts()).some((row) => row.id === id)).toBe(false);
    // ...and the browsable listing is untouched: the default People page still
    // lists it, because nothing about it was hidden — only un-suggested.
    const listed = await listContactsPage({
      page: 1,
      pageSize: 50,
      name: "Vegetable Vendor Suppression",
    });
    expect(listed.rows.some((row) => row.id === id)).toBe(true);
  });

  it("an unjudged contact (person_kind NULL) is still suggested", async () => {
    // The IS DISTINCT FROM guard: with `<> 'service'` this row — like every row
    // until the classification backfill drains — would match nothing and the
    // whole due feed would silently empty.
    const id = await createOverdue("Never Judged Nadia");
    const [row] = await getDb().then((db) =>
      db.select({ kind: contacts.personKind }).from(contacts).where(eq(contacts.id, id)),
    );
    expect(row?.kind).toBeNull();
    expect((await listDueReachOuts()).some((entry) => entry.id === id)).toBe(true);
  });

  it("records a user ruling as a lock the nightly sweep must not re-judge", async () => {
    const id = await createOverdue("Locked Lakshmi");
    await setPersonKind(id, "service");
    const db = await getDb();
    const [row] = await db
      .select({
        kind: contacts.personKind,
        by: contacts.personKindBy,
        confidence: contacts.personKindConfidence,
        classifiedAt: contacts.personClassifiedAt,
      })
      .from(contacts)
      .where(eq(contacts.id, id));
    expect(row?.kind).toBe("service");
    // 'user' is what makes the correction survive every later run.
    expect(row?.by).toBe("user");
    // No model certainty to order a review list by, and visibly judged.
    expect(row?.confidence).toBeNull();
    expect(row?.classifiedAt).not.toBeNull();
  });

  it("counts and lists the suppressed rows so the hide is visible and reversible", async () => {
    const id = await createOverdue("Counted Cab Office");
    await setPersonKind(id, "service");

    expect(await countServiceContacts()).toBeGreaterThan(0);
    // The People header's count links here; the link must land on the rows.
    const hidden = await listContactsPage({ page: 1, pageSize: 200, kind: "service" });
    expect(hidden.rows.some((row) => row.id === id)).toBe(true);

    // And the ruling is reversible: marking them a person restores nomination.
    await setPersonKind(id, "person");
    expect((await listDueReachOuts()).some((row) => row.id === id)).toBe(true);
  });
});
