import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContactProfile, forgetContact, getContact } from "@/lib/repo/contacts";
import { listLinks, pushContactSync } from "@/lib/repo/sync";
import { USER, method, observed, profile, push } from "./helpers";

/**
 * The four rules a user states about a two-way sync, each written as the thing
 * that must never happen. Separated from the mechanism tests beside them
 * (deletion, identity, push-outward) because these are the PROMISES: a refactor
 * that keeps every mechanism working and still breaks one of these has broken
 * the product.
 *
 * The asymmetry is deliberate and is the whole design. A deletion is destructive
 * and never crosses the boundary in either direction; a creation is additive and
 * crosses in both.
 */
async function countNamed(name: string): Promise<number> {
  const db = await getDb();
  return (await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.name, name)))
    .length;
}

async function linkFor(externalId: string): Promise<{ state: string; contactId: string } | null> {
  return (await listLinks(await getDb(), "device")).find((r) => r.externalId === externalId) ?? null;
}

describe("contact sync — the four product rules", () => {
  it("1. deleting a contact on the phone does not delete it in Dhaga", async () => {
    const id = await createContactProfile(profile({ name: "Rule One Person" }), "manual");
    await pushContactSync(
      USER,
      push({
        containerId: "rules-one",
        contacts: [observed({ externalId: "rule-one-1", name: "Rule One Person" })],
        full: true,
      }),
    );

    // The strongest form of the deletion: the user emptied the whole address
    // book. `observedEmpty` is the deliberate claim that makes that reportable
    // at all — before it, `contacts: []` was rejected at the wire, so emptying
    // the phone silently did nothing.
    await pushContactSync(
      USER,
      push({ containerId: "rules-one", contacts: [], observedEmpty: true }),
    );

    expect((await linkFor("rule-one-1"))?.state).toBe("unlinked");
    // The person, their notes and everything hanging off them stay. A record
    // leaving an address book is not consent to destroy a CRM entry.
    expect((await getContact(id))?.contact.name).toBe("Rule One Person");
  });

  it("2. adding a contact on the phone creates it in Dhaga", async () => {
    const result = await pushContactSync(
      USER,
      push({
        containerId: "rules-two",
        contacts: [
          observed({
            externalId: "rule-two-1",
            name: "Rule Two Person",
            emails: [method("rule.two@example.com")],
          }),
        ],
      }),
    );

    expect(result.created).toBe(1);
    expect(await countNamed("Rule Two Person")).toBe(1);
    expect((await linkFor("rule-two-1"))?.state).toBe("linked");
  });

  it("3. deleting a contact in Dhaga does not delete it on the phone — or undo itself", async () => {
    const email = [method("rule.three@example.com")];
    const onPhone = observed({
      externalId: "rule-three-1",
      name: "Rule Three Person",
      emails: email,
    });
    const syncPhone = (): Promise<{ created: number; linked: number }> =>
      pushContactSync(USER, push({ containerId: "rules-three", contacts: [onPhone] }));

    const id = await createContactProfile(
      profile({ name: "Rule Three Person", emails: email }),
      "manual",
    );
    await syncPhone();
    await forgetContact(id);

    // The phone still holds the record — nothing here can delete it, and the
    // next sync sees it exactly as before. What it must NOT do is read an
    // unknown external id with no contact behind it as a new person: the link
    // row cascaded away with the contact, so without a tombstone that outlives
    // the cascade this re-creates them and the user's deletion undoes itself.
    const after = await syncPhone();
    expect(after.created).toBe(0);
    expect(after.linked).toBe(0);
    expect(await countNamed("Rule Three Person")).toBe(0);

    // Un-delete: the user adds them back in Dhaga. The dedup ladder matches the
    // device record to the new contact, which settles the tombstone — the pair
    // must sync normally from here, not stay blocked forever.
    const again = await createContactProfile(
      profile({ name: "Rule Three Person", emails: email }),
      "manual",
    );
    const readopted = await syncPhone();
    expect(readopted.created).toBe(0);
    expect(readopted.linked).toBe(1);
    expect((await linkFor("rule-three-1"))?.contactId).toBe(again);
  });

  it("4. creating a contact in Dhaga offers it to the phone — if the user made it", async () => {
    const authored = await createContactProfile(profile({ name: "Rule Four Authored" }), "manual");
    // Same shape, different provenance: a row that arrived from a CSV, another
    // account or an earlier sync. Offering these turns "add my Dhaga people to
    // my phone" into "replay every list I have ever imported", which is the
    // reason this direction was off by default in the first place.
    const imported = await createContactProfile(profile({ name: "Rule Four Imported" }), "import");

    const result = await pushContactSync(
      USER,
      push({
        containerId: "rules-four",
        contacts: [observed({ externalId: "rule-four-seed", name: "Rule Four Seed" })],
      }),
      { pushUnlinked: true },
    );

    const created = result.writes.filter((w) => w.externalId === null).map((w) => w.contactId);
    expect(created).toContain(authored);
    expect(created).not.toContain(imported);
  });
});
