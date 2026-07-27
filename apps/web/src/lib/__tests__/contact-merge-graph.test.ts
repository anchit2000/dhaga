import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, eventContacts } from "@/lib/db/schema";
import { getContact, mergeContacts } from "@/lib/repo/contacts";
import { addContactToEvent, createEvent, listEventContacts } from "@/lib/repo/events";
import { insertEdge, mergeResolution, uniqueContact } from "./support/contact-fixtures";

/**
 * Re-pointing endpoints can turn distinct edges into duplicates (both contacts
 * "knows" the same third person) or into self-edges (an edge that ran between
 * the two merged contacts). mergeMentionedContact drops self-edges but never
 * de-dups — a merge that left parallel edges would pollute the graph. This pins
 * both cleanups.
 */
describe("mergeContacts de-duplicates edges and removes merge-created self-edges", () => {
  it("keeps one live edge per (src, predicate, dst) and no target→target self-edge", async () => {
    const target = await uniqueContact("T");
    const source = await uniqueContact("S");
    const other = await uniqueContact("O");

    await insertEdge(target, "knows", other); // already on the survivor
    await insertEdge(source, "knows", other); // becomes a duplicate after re-point
    await insertEdge(source, "knows", target); // becomes a target→target self-edge

    await mergeContacts(mergeResolution(target, [source]));

    const db = await getDb();
    const knowsOther = await db
      .select()
      .from(edges)
      .where(and(eq(edges.srcType, "contact"), eq(edges.srcId, target), eq(edges.predicate, "knows"), eq(edges.dstId, other)));
    expect(knowsOther).toHaveLength(1); // the duplicate was collapsed
    const selfEdges = await db.select().from(edges).where(and(eq(edges.srcId, target), eq(edges.dstId, target)));
    expect(selfEdges).toHaveLength(0); // the self-edge was removed
  });
});

/**
 * event_contacts has a composite PK (event_id, contact_id). If a source and the
 * survivor were both scanned into one event, blindly re-pointing the source row
 * would violate that PK. The delete-then-repoint must leave ONE row for the
 * survivor and drop the source's — while a source-only event still moves across.
 */
describe("mergeContacts collapses the event_contacts composite-PK collision", () => {
  it("leaves one membership row per event and no source rows", async () => {
    const target = await uniqueContact("T");
    const source = await uniqueContact("S");
    const shared = await createEvent(`shared ${randomUUID()}`);
    const sourceOnly = await createEvent(`only ${randomUUID()}`);
    await addContactToEvent(shared, target);
    await addContactToEvent(shared, source);
    await addContactToEvent(sourceOnly, source);

    await mergeContacts(mergeResolution(target, [source]));

    expect((await listEventContacts(shared)).map((m) => m.id)).toEqual([target]);
    expect((await listEventContacts(sourceOnly)).map((m) => m.id)).toEqual([target]);
    const db = await getDb();
    expect(await db.select().from(eventContacts).where(eq(eventContacts.contactId, source))).toHaveLength(0);
  });
});

/**
 * The union rules matter because dropping a value is silent data loss and
 * duplicating one clutters the survivor. Emails differing only by case must
 * collapse to one; a tag on either record survives exactly once; the OR-ed
 * flags mean starring EITHER record keeps the survivor starred; and the user's
 * resolved scalars win.
 */
describe("mergeContacts unions multi-value fields and applies the resolved scalars", () => {
  it("dedupes emails case-insensitively, unions tags, ORs starred, takes resolved name/location", async () => {
    const target = await uniqueContact("T", { emails: ["A@x.com", "t@x.com"] });
    const source = await uniqueContact("S", { emails: ["a@x.com", "s@x.com"] });
    const db = await getDb();
    await db.update(contacts).set({ tags: ["vip"], starred: false }).where(eq(contacts.id, target));
    await db.update(contacts).set({ tags: ["vip", "lead"], starred: true }).where(eq(contacts.id, source));

    await mergeContacts(mergeResolution(target, [source], { name: "Chosen Name", location: "Berlin" }));

    const survivor = await getContact(target);
    const emailValues = survivor?.contact.emails.map((m) => m.value.toLowerCase()) ?? [];
    expect(emailValues.filter((v) => v === "a@x.com")).toHaveLength(1); // case-collapsed to one
    expect(emailValues).toEqual(expect.arrayContaining(["a@x.com", "t@x.com", "s@x.com"]));
    expect(survivor?.contact.tags.slice().sort()).toEqual(["lead", "vip"]);
    expect(survivor?.contact.starred).toBe(true);
    expect(survivor?.contact.name).toBe("Chosen Name");
    expect(survivor?.contact.location).toBe("Berlin");
  });
});
