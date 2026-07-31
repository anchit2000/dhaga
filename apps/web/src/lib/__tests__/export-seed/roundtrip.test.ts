import { describe, expect, it } from "vitest";
import { parseBack, seedContact } from "./helpers";

/**
 * The seed .vcf is read back by the platform's OWN vCard importer here, because
 * that is the ladder a phone's address book puts it through too: whatever this
 * parse loses is what the first sync will see missing from the phone.
 */
describe("seed .vcf round-trips through the vCard importer", () => {
  it("preserves nickname, birthday and custom dates — the fields a seed used to drop", () => {
    const parsed = parseBack(seedContact);

    expect(parsed.name).toBe("Priya Raman");
    expect(parsed.nickname).toBe("Pri");
    expect(parsed.positions[0]?.title).toBe("Head of Design");
    expect(parsed.positions[0]?.company).toBe("Loomcraft");
    expect(parsed.importantDates).toEqual([
      { label: "Birthday", value: "1988-03-04", note: null },
      { label: "Work anniversary", value: "2019-09-01", note: null },
    ]);
    expect(parsed.emails.map((m) => m.value)).toEqual([
      "priya@loomcraft.example",
      "priya@personal.example",
    ]);
    expect(parsed.phones.map((m) => m.value)).toEqual(["+91 98765 43210"]);
  });

  it("preserves every address and its label verbatim, custom labels included", () => {
    // A TYPE token could carry "Home" (as "Home") but not "Studio" — resolveLabel
    // maps only HOME/WORK/OTHER — so the item-group X-ABLabel is what makes the
    // second address come back as the same entry rather than an edited one.
    const parsed = parseBack(seedContact);
    expect(parsed.addresses).toEqual(seedContact.addresses);
  });

  it("does not turn the free-text location into a structured address", () => {
    const parsed = parseBack({ ...seedContact, addresses: [], location: "Pune" });
    expect(parsed.addresses).toEqual([]);
  });

  it("leaves an unlabeled method unlabeled instead of inventing one", () => {
    // A TYPE=WORK default would come back as a label the user never chose, and
    // the first sync would read it as a divergence — see ./merge-safety for
    // what that cost at seed scale.
    const parsed = parseBack(seedContact);
    expect(parsed.emails[1]).toMatchObject({ value: "priya@personal.example", label: null });
    expect(parsed.emails[0]).toMatchObject({ value: "priya@loomcraft.example", label: "Work" });
  });
});
