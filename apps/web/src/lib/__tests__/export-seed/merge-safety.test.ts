import { describe, expect, it } from "vitest";
import { mergeSyncedContact } from "@dhaga/core";
import { contactsToVCards } from "@/lib/export/formats";
import { vcardToCandidates } from "@/lib/import/vcard";
import { localSide, parseBack, remoteSide, seedContact, unlabeledContact } from "./helpers";
import type { SyncableContact } from "@dhaga/core";

/**
 * Why the vCard properties pinned in ./roundtrip are load-bearing.
 *
 * Seeding is only safe if the merge survives the phone handing our own data
 * back. The merge has no clocks: a field present in the BASE and absent from
 * the phone is a deletion the phone made, and it is honoured silently. So a
 * field the seed drops is not merely missing on the phone — it is deleted in
 * Dhaga on the SECOND sync, once the first has written the merged result as the
 * base. These two tests are the same scenario with and without the fix.
 */
describe("seeded contacts survive the sync that follows", () => {
  /** Two runs against an unchanged phone record, the way sync would run them. */
  function syncTwice(local: SyncableContact, remote: SyncableContact): SyncableContact {
    const first = mergeSyncedContact({ base: null, local, remote });
    return mergeSyncedContact({ base: first.merged, local: first.merged, remote }).merged;
  }

  it("keeps nickname and dates when the seed carried them", () => {
    const local = localSide(seedContact);
    const after = syncTwice(local, remoteSide(parseBack(seedContact)));

    expect(after.nickname).toBe("Pri");
    expect(after.importantDates).toEqual(local.importantDates);
  });

  it("destroys them when the seed omitted them — the regression this guards", () => {
    const local = localSide(seedContact);
    // A phone record seeded from a .vcf with no NICKNAME and no dates. The
    // nickname survives run one only because Dhaga's value is kept when the
    // phone is silent; the base then records it, and run two reads its absence
    // as a deletion.
    const lossy: SyncableContact = {
      ...remoteSide(parseBack(seedContact)),
      nickname: null,
      importantDates: [],
    };

    const first = mergeSyncedContact({ base: null, local, remote: lossy });
    expect(first.merged.nickname).toBe("Pri");

    const after = syncTwice(local, lossy);
    expect(after.nickname).toBeNull();
    expect(after.importantDates).toEqual([]);
  });

  it("keeps structured addresses when the seed carried them", () => {
    const local = localSide(seedContact);
    const remote = remoteSide(parseBack(seedContact));

    // Labels included. addressKey ignores the label, so a mangled one cannot
    // fork the entry into a duplicate — it makes the SAME entry compare unequal,
    // which on a first link is a conflict per address per contact.
    expect(remote.addresses).toEqual(local.addresses);
    expect(mergeSyncedContact({ base: null, local, remote }).conflicts).toEqual([]);
    expect(syncTwice(local, remote).addresses).toEqual(local.addresses);
  });

  it("destroys addresses when the seed omitted them — the ADR that was never written", () => {
    const local = localSide(seedContact);
    // The export emitted an ADR built from contacts.location and never touched
    // contacts.addresses, so every structured address read back as absent.
    const lossy: SyncableContact = { ...remoteSide(parseBack(seedContact)), addresses: [] };

    const first = mergeSyncedContact({ base: null, local, remote: lossy });
    // Run one is the trap: the addresses survive and NOTHING is reported, so
    // there is no signal that the seed was lossy at all.
    expect(first.merged.addresses).toEqual(local.addresses);
    expect(first.conflicts).toEqual([]);

    // Run two, with the merged result now standing as the base. The remote is
    // still silent, but silence now reads as a deletion — and it is honoured
    // without a conflict, which is what makes it unrecoverable.
    const second = mergeSyncedContact({ base: first.merged, local: first.merged, remote: lossy });
    expect(second.merged.addresses).toEqual([]);
    expect(second.conflicts).toEqual([]);
  });

  it("does not invent an address out of the free-text location field", () => {
    // `location` is display text ("Pune", "Remote"), not postal data, and is not
    // a synced field. Writing it as ADR;TYPE=WORK meant a contact with no
    // address at all came back from the phone holding one, and the merge pulled
    // that fabrication into contacts.addresses as a remote-only addition.
    const placeOnly = { ...seedContact, addresses: [], location: "Pune" };
    const remote = remoteSide(parseBack(placeOnly));

    expect(remote.addresses).toEqual([]);
    const merged = mergeSyncedContact({ base: null, local: localSide(placeOnly), remote }).merged;
    expect(merged.addresses).toEqual([]);
  });
});

/**
 * The property that decides whether the bulk path is usable at all.
 *
 * Seeding is only a shortcut if the first sync afterwards is SILENT. A conflict
 * row per contested field per contact turns "import one .vcf" into a review
 * queue longer than the address book — a worse outcome than the 500-per-run cap
 * the bulk path exists to escape. Measured on this fixture before the fix: 1400
 * rows for 700 contacts (700 emails + 700 phones), produced by nothing but the
 * export's invented TYPE=WORK meeting a merge that treated a blank as a claim.
 */
describe("a bulk seed produces no conflicts to review", () => {
  it("raises zero conflicts across a multi-contact seed of unlabeled methods", () => {
    const rows = [unlabeledContact(1), unlabeledContact(2), unlabeledContact(3)];
    const parsed = vcardToCandidates(contactsToVCards(rows));
    expect(parsed).toHaveLength(3);

    const results = rows.map((row, i) =>
      mergeSyncedContact({
        base: null,
        local: localSide(row),
        remote: remoteSide(parsed[i].contact),
      }),
    );

    // The COUNT is the property that broke, so the count is what is asserted.
    expect(results.flatMap((result) => result.conflicts)).toEqual([]);
    // And nothing was quietly dropped to achieve it.
    expect(results[0].merged.emails.map((m) => m.value)).toEqual([
      "bulk1@example.com",
      "bulk1@home.example",
    ]);
    expect(results[0].merged.phones.map((m) => m.value)).toEqual(["+1 555 0101"]);
  });
});
