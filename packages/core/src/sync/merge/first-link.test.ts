import { describe, expect, it } from "vitest";

import { mergeSyncedContact } from "./index";
import type { SyncableContact } from "../types";

/**
 * What a FIRST link may decide on its own, and what it must hand to the user.
 *
 * With no base, nothing can be attributed — so the only question worth asking
 * is whether the two sides actually disagree. A field one side left blank is
 * silence, not a claim, and adjudicating silence is asking the user to do our
 * job. It is also unaffordable: an address book seeded from Dhaga's own vCard
 * export answers "no label" for most methods, and treating each as a
 * disagreement produced 1400 conflict rows for a 700-contact seed — a review
 * queue longer than the address book, and worse than the per-run create cap the
 * bulk seed exists to escape.
 *
 * The line these tests defend is narrow and cuts both ways: blanks fill, and
 * two REAL differing values still conflict. If a later change makes the third
 * test below pass by adopting the remote value, "fill the blank" has quietly
 * become "the phone always wins", and every curated value in Dhaga is at risk
 * the moment a user connects an account.
 */

function phone(value: string, label: string | null = "Mobile") {
  return { value, label, note: null };
}

function contact(over: Partial<SyncableContact> = {}): SyncableContact {
  return {
    name: "Priya Sharma",
    nickname: null,
    title: "Engineer",
    company: "Acme",
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
    ...over,
  };
}

describe("mergeSyncedContact — first link treats a blank as silence", () => {
  it("fills a blank from the other side without asking", () => {
    // The phone knows this number is "Home"; Dhaga knows nothing about it.
    // There is nothing here for a user to decide.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ nickname: null, phones: [phone("111", null)] }),
      remote: contact({ nickname: "Pri", phones: [phone("111", "Home")] }),
    });

    expect(result.conflicts).toEqual([]);
    expect(result.merged.nickname).toBe("Pri");
    expect(result.merged.phones).toEqual([{ value: "111", label: "Home", note: null }]);
  });

  it("keeps Dhaga's value when the PHONE is the silent side", () => {
    // The same rule in the other direction: an address book carrying no
    // nickname is not asserting the contact has none. Keeping ours raises
    // nothing — and leaves the field PUSHABLE, which matters because a
    // contested field is never pushed and is then read as a deletion on the
    // second run, once the base records a value the phone never had.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ nickname: "Pri", phones: [phone("111", "Home")] }),
      remote: contact({ nickname: null, phones: [phone("111", null)] }),
    });

    expect(result.conflicts).toEqual([]);
    expect(result.merged.nickname).toBe("Pri");
    expect(result.merged.phones).toEqual([{ value: "111", label: "Home", note: null }]);
    expect(result.changedRemotely).toContain("nickname");
  });

  it("STILL conflicts when both sides carry a real, different value", () => {
    // Dhaga says Work, the phone says Home. Both are claims a user made and
    // exactly one is about to be wrong, so this must reach them — with Dhaga's
    // value kept and nothing pushed outward.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ company: "Acme", phones: [phone("111", "Work")] }),
      remote: contact({ company: "Acme Corp", phones: [phone("111", "Home")] }),
    });

    expect(result.merged.phones).toEqual([{ value: "111", label: "Work", note: null }]);
    expect(result.merged.company).toBe("Acme");
    expect(result.conflicts.map((c) => c.field).sort()).toEqual(["company", "phones"]);
    expect(result.changedRemotely).not.toContain("phones");
    expect(result.changedRemotely).not.toContain("company");
  });

  it("treats a whitespace-only value as silence too", () => {
    // " " is a blank dressed as a value; prompting for it would be the same
    // meaningless decision with an invisible character attached.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ title: "   " }),
      remote: contact({ title: "Staff Engineer" }),
    });

    expect(result.conflicts).toEqual([]);
    expect(result.merged.title).toBe("Staff Engineer");
  });
});
