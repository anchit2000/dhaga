import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { createContactProfile, getContact } from "@/lib/repo/contacts";
import { listLinks, pushContactSync } from "@/lib/repo/sync";
import { USER, method, observed, profile, push, role } from "./helpers";

/**
 * A provider id that misses must never mean "new person". iOS UUIDs, Android
 * _IDs and People API resource names are all re-minted by a restore-from-backup
 * or an account re-add, so a miss that created a contact would duplicate the
 * user's entire address book the first time they restore a phone.
 */
describe("sync identity — external id misses fall back to dedup", () => {
  it("matches on email when the external id is unknown", async () => {
    const id = await createContactProfile(
      profile({ name: "Sync Email Person", emails: [method("sync.email@example.com")] }),
      "manual",
    );

    const result = await pushContactSync(
      USER,
      push({
        containerId: "container-email",
        contacts: [
          observed({
            externalId: "restored-1",
            name: "Sync Email Person",
            emails: [method("SYNC.EMAIL@example.com")],
            phones: [method("+1 555 0111")],
          }),
        ],
      }),
    );

    expect(result.created).toBe(0); // the duplicate this fallback exists to prevent
    expect(result.linked).toBe(1);
    expect(result.pulled).toBe(1);
    expect((await getContact(id))?.contact.phones.map((p) => p.value)).toEqual(["+1 555 0111"]);
    const links = await listLinks(await getDb(), "device");
    expect(links.find((link) => link.externalId === "restored-1")?.contactId).toBe(id);
  });

  it("matches on phone across formatting, then on name + company", async () => {
    const phoneId = await createContactProfile(
      profile({ name: "Sync Phone Person", phones: [method("+1 (555) 010-2020")] }),
      "manual",
    );
    const namedId = await createContactProfile(
      profile({ name: "Sync Named Person", positions: [role("Head of Ops", "Sync Logistics GmbH")] }),
      "manual",
    );

    const result = await pushContactSync(
      USER,
      push({
        containerId: "container-fallback",
        contacts: [
          // Same number, different formatting and a different spelling of the
          // name — the .vcf/device case where there is no email on either side.
          observed({
            externalId: "phone-1",
            name: "Sync Phone Nickname",
            phones: [method("15550102020")],
          }),
          // No email, no phone: only name + company can identify this one, and
          // `company` is comparable at all only because the FK was resolved to
          // a name on the way out of the database.
          observed({
            externalId: "named-1",
            name: "Sync Named Person",
            title: "Head of Ops",
            company: "Sync Logistics GmbH",
          }),
        ],
      }),
    );

    expect(result.created).toBe(0);
    expect(result.linked).toBe(2);
    const links = await listLinks(await getDb(), "device");
    expect(links.find((link) => link.externalId === "phone-1")?.contactId).toBe(phoneId);
    expect(links.find((link) => link.externalId === "named-1")?.contactId).toBe(namedId);
  });

  it("creates a contact only when every identity route misses", async () => {
    const result = await pushContactSync(
      USER,
      push({
        containerId: "container-new",
        contacts: [
          observed({
            externalId: "new-1",
            name: "Sync Brand New",
            emails: [method("brand.new@example.com")],
          }),
          // The same person twice in one batch (two device records) must not
          // create the contact twice.
          observed({
            externalId: "new-2",
            name: "Sync Brand New",
            emails: [method("brand.new@example.com")],
          }),
        ],
      }),
    );

    expect(result.created).toBe(1);
    expect(result.linked).toBe(2);
    // A contact created from this very observation is its own base: the merge
    // must not report a first-link conflict against the row it just wrote.
    expect(result.pulled).toBe(0);
    expect(result.conflicts).toEqual([]);
    expect(result.writes).toEqual([]);
  });

  it("does not treat a punctuation-only name as an identity", async () => {
    // A name+company key of nothing but separators identifies nobody. Junk names
    // like this come out of bad .vcf imports, and normalizeForMatch keeps
    // punctuation, so the key survives as content-free. If such a key gets
    // indexed, the NEXT content-free contact matches it and two unrelated people
    // are merged into one — the least recoverable failure in a contact app,
    // which is why this must create rather than match.
    await createContactProfile(profile({ name: "|" }), "manual");

    const result = await pushContactSync(
      USER,
      push({
        containerId: "container-punct",
        contacts: [observed({ externalId: "punct-1", name: "|" })],
      }),
    );

    expect(result.created).toBe(1);
    expect(result.pulled).toBe(0);
  });

  it("reuses the link on the next run instead of re-linking", async () => {
    await pushContactSync(
      USER,
      push({
        containerId: "container-stable",
        contacts: [observed({ externalId: "stable-1", name: "Sync Stable Person" })],
      }),
    );
    const again = await pushContactSync(
      USER,
      push({
        containerId: "container-stable",
        contacts: [observed({ externalId: "stable-1", name: "Sync Stable Person" })],
      }),
    );
    expect(again).toMatchObject({ created: 0, linked: 0, pulled: 0 });
    expect(again.writes).toEqual([]);
  });
});
