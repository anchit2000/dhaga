import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, positions, signals } from "@/lib/db/schema";
import {
  addContactsToCompany,
  addTagToContacts,
  findDuplicateContactClusters,
  forgetContacts,
  getContact,
  getContactsForMerge,
  removeTagFromContacts,
  setContactsStarred,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { insertSignal, uniqueContact } from "./support/contact-fixtures";

/** Starring is a bulk table action; both contacts must flip together and back. */
describe("setContactsStarred", () => {
  it("stars and unstars many contacts in one call", async () => {
    const a = await uniqueContact("A");
    const b = await uniqueContact("B");
    await setContactsStarred([a, b], true);
    expect((await getContact(a))?.contact.starred).toBe(true);
    expect((await getContact(b))?.contact.starred).toBe(true);
    await setContactsStarred([a, b], false);
    expect((await getContact(a))?.contact.starred).toBe(false);
  });
});

/**
 * The tag ops are per-row add-if-absent / remove-if-present: adding a tag a
 * contact already carries must NOT duplicate it, and the same call must still
 * add it to a contact that lacks it. Anything else corrupts the tag list.
 */
describe("addTagToContacts / removeTagFromContacts", () => {
  it("adds without duplicating and removes cleanly, per row", async () => {
    const already = await uniqueContact("Already");
    const lacking = await uniqueContact("Lacking");
    const db = await getDb();
    await db.update(contacts).set({ tags: ["vip"] }).where(eq(contacts.id, already));

    await addTagToContacts([already, lacking], "vip");
    expect((await getContact(already))?.contact.tags).toEqual(["vip"]); // not doubled
    expect((await getContact(lacking))?.contact.tags).toEqual(["vip"]); // added

    await removeTagFromContacts([already, lacking], "vip");
    expect((await getContact(already))?.contact.tags).toEqual([]);
    expect((await getContact(lacking))?.contact.tags).toEqual([]);
  });
});

/**
 * forgetContacts is the batch of forgetContact's full cascade in one
 * transaction. Seeding a signal (a NOT NULL FK with no ON DELETE cascade — the
 * exact row that broke single-contact forget) proves the cascade runs for every
 * id, not just the contact rows.
 */
describe("forgetContacts", () => {
  it("forgets many contacts and their cascade rows in one transaction", async () => {
    const a = await uniqueContact("A");
    const b = await uniqueContact("B");
    await addNote(a, "text", "a note");
    const signalId = await insertSignal(a);

    await forgetContacts([a, b]);

    expect(await getContact(a)).toBeNull();
    expect(await getContact(b)).toBeNull();
    const db = await getDb();
    expect(await db.select().from(signals).where(eq(signals.id, signalId))).toHaveLength(0);
  });
});

/**
 * Adding contacts to a company must both create the current position AND
 * refresh the denormalised company_id the list/graph read from — and calling it
 * twice must not stack duplicate positions at the same company.
 */
describe("addContactsToCompany", () => {
  it("adds a current position, updates the denormalised company, and is idempotent", async () => {
    const a = await uniqueContact("A");
    const companyName = `NewCo ${randomUUID()}`;

    const { companyId } = await addContactsToCompany([a], companyName);
    expect((await getContact(a))?.companyName).toBe(companyName);

    // Second call for the same company must not add a second current position.
    await addContactsToCompany([a], companyName);
    const db = await getDb();
    const rows = await db
      .select()
      .from(positions)
      .where(and(eq(positions.contactId, a), eq(positions.companyId, companyId), eq(positions.isCurrent, true)));
    expect(rows).toHaveLength(1);
  });
});

/** The merge dialog reads this; it must return one row per id with the labeled
 *  method-object shape (not legacy bare strings). */
describe("getContactsForMerge", () => {
  it("returns each requested contact with normalized method objects", async () => {
    const a = await uniqueContact("A", { emails: ["a@x.com"] });
    const b = await uniqueContact("B");
    const records = await getContactsForMerge([a, b]);
    expect(records.map((r) => r.id).sort()).toEqual([a, b].sort());
    expect(records.find((r) => r.id === a)?.emails).toEqual([{ value: "a@x.com", label: null, note: null }]);
  });
});

/** Duplicate detection groups accidental doubles so the user can merge them —
 *  a shared email (normalized case-insensitively) is the strongest signal. */
describe("findDuplicateContactClusters", () => {
  it("clusters contacts that share a normalized email", async () => {
    const shared = `dupe-${randomUUID()}@x.com`;
    const first = await uniqueContact("Dup One", { emails: [shared.toUpperCase()] });
    const second = await uniqueContact("Dup Two", { emails: [shared] });

    const cluster = (await findDuplicateContactClusters()).find(
      (c) => c.reason === "email" && c.contacts.some((x) => x.id === first) && c.contacts.some((x) => x.id === second),
    );
    expect(cluster).toBeDefined();
    expect(cluster?.contacts).toHaveLength(2);
  });
});
