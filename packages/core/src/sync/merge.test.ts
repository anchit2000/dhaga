import { describe, expect, it } from "vitest";

import { mergeSyncedContact } from "./merge";
import type { SyncableContact } from "./types";

/**
 * These tests pin the guarantees the sync design exists to provide. Each one
 * encodes a way two-way contact sync goes wrong in the wild:
 *   - it silently loses an edit the user made on their phone,
 *   - it resurrects data the user deliberately deleted,
 *   - or it treats an ADDED phone number as a competing rename and clobbers one.
 * If a change to the merge makes any of these pass for the wrong reason, the
 * feature is unsafe to ship regardless of what the type checker says.
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

describe("mergeSyncedContact — multi-value fields merge additively", () => {
  it("treats a number added on the phone as an addition, not a conflict", () => {
    // The literal case the feature was asked for: the user adds a second
    // number in the iOS Contacts app. Nothing in Dhaga changed, so this must
    // flow inward cleanly with no user prompt.
    const base = contact({ phones: [phone("+91 98765 43210")] });
    const result = mergeSyncedContact({
      base,
      local: contact({ phones: [phone("+91 98765 43210")] }),
      remote: contact({ phones: [phone("+91 98765 43210"), phone("+91 91234 56789", "Work")] }),
    });

    expect(result.conflicts).toEqual([]);
    expect(result.merged.phones.map((p) => p.value)).toEqual([
      "+91 98765 43210",
      "+91 91234 56789",
    ]);
    expect(result.changedLocally).toContain("phones");
    // Already present remotely — pushing it back would be a redundant write.
    expect(result.changedRemotely).not.toContain("phones");
  });

  it("unions when BOTH sides add a different number", () => {
    // Concurrent additions are not a conflict: neither edit contradicts the
    // other, so losing either would be pure data loss.
    const base = contact({ phones: [phone("111")] });
    const result = mergeSyncedContact({
      base,
      local: contact({ phones: [phone("111"), phone("222")] }),
      remote: contact({ phones: [phone("111"), phone("333")] }),
    });

    expect(result.conflicts).toEqual([]);
    expect(result.merged.phones.map((p) => p.value)).toEqual(["111", "222", "333"]);
    expect(result.changedRemotely).toContain("phones");
  });

  it("matches the same link across a trailing slash", () => {
    // Profile URLs arrive with and without a trailing slash from different
    // sources (the device stores what was pasted). Without collapsing it, every
    // sync would append a second copy of the same link, forever.
    const link = (value: string) => ({ value, label: null, note: null });
    const result = mergeSyncedContact({
      base: contact({ links: [link("https://linkedin.com/in/priya")] }),
      local: contact({ links: [link("https://linkedin.com/in/priya")] }),
      remote: contact({ links: [link("https://linkedin.com/in/priya///")] }),
    });

    expect(result.merged.links).toHaveLength(1);
  });

  it("matches the same number across formatting differences", () => {
    // The device returns "+91 98765 43210"; a vCard import stored "9876543210".
    // Without digit normalisation the merge would double every phone number on
    // the first sync — the most visible possible failure.
    const result = mergeSyncedContact({
      base: contact({ phones: [phone("9876543210")] }),
      local: contact({ phones: [phone("9876543210")] }),
      remote: contact({ phones: [phone("+91 98765 43210")] }),
    });

    expect(result.merged.phones).toHaveLength(1);
  });
});

describe("mergeSyncedContact — scalar ownership", () => {
  it("pushes a Dhaga-only edit outward", () => {
    const result = mergeSyncedContact({
      base: contact({ title: "Engineer" }),
      local: contact({ title: "VP Engineering" }),
      remote: contact({ title: "Engineer" }),
    });

    expect(result.merged.title).toBe("VP Engineering");
    expect(result.changedRemotely).toContain("title");
    expect(result.changedLocally).not.toContain("title");
  });

  it("pulls a phone-only edit inward without prompting", () => {
    const result = mergeSyncedContact({
      base: contact({ name: "Priya Sharma" }),
      local: contact({ name: "Priya Sharma" }),
      remote: contact({ name: "Priya Sharma-Rao" }),
    });

    expect(result.merged.name).toBe("Priya Sharma-Rao");
    expect(result.conflicts).toEqual([]);
    expect(result.changedLocally).toContain("name");
  });

  it("never clobbers a phone edit when both sides moved, and never pushes back", () => {
    // The decisive rule: an edit the user typed on their phone survives on the
    // phone. Dhaga's losing value is preserved in `conflicts` so the review UI
    // can offer it back — nothing is destroyed, but nothing is overwritten either.
    const result = mergeSyncedContact({
      base: contact({ company: "Acme" }),
      local: contact({ company: "Acme Corp" }),
      remote: contact({ company: "Acme International" }),
    });

    expect(result.merged.company).toBe("Acme International");
    expect(result.changedRemotely).not.toContain("company");
    expect(result.conflicts).toEqual([
      { field: "company", kind: "both_edited", local: "Acme Corp", remote: "Acme International" },
    ]);
  });
});

describe("mergeSyncedContact — deletions and first link", () => {
  it("honours a deletion the other side did not touch", () => {
    // The user deleted an old number on their phone. Re-pushing it forever
    // would make sync feel broken, so an uncontested removal is respected.
    const result = mergeSyncedContact({
      base: contact({ phones: [phone("111"), phone("222")] }),
      local: contact({ phones: [phone("111"), phone("222")] }),
      remote: contact({ phones: [phone("111")] }),
    });

    expect(result.merged.phones.map((p) => p.value)).toEqual(["111"]);
    expect(result.conflicts).toEqual([]);
  });

  it("refuses to delete an entry the other side edited", () => {
    // Removal racing an edit is ambiguous, and deleting contact data on a
    // heuristic is unrecoverable — so the entry survives and is flagged.
    const result = mergeSyncedContact({
      base: contact({ phones: [phone("111", "Home")] }),
      local: contact({ phones: [phone("111", "Work")] }),
      remote: contact({ phones: [] }),
    });

    expect(result.merged.phones).toHaveLength(1);
    expect(result.conflicts.map((c) => c.field)).toContain("phones");
  });

  it("on first link keeps Dhaga's value, pushes nothing, and flags it", () => {
    // With no base we cannot tell who edited what. Adopting either side would
    // silently rewrite real data the moment the user connects their phone.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ title: "VP Engineering" }),
      remote: contact({ title: "Engineer" }),
    });

    expect(result.merged.title).toBe("VP Engineering");
    expect(result.changedRemotely).not.toContain("title");
    expect(result.conflicts.map((c) => c.field)).toContain("title");
  });

  it("still unions multi-values on first link", () => {
    // Additive fields are safe even without a base: a union invents nothing.
    const result = mergeSyncedContact({
      base: null,
      local: contact({ emails: [{ value: "p@acme.com", label: null, note: null }] }),
      remote: contact({ emails: [{ value: "priya@home.com", label: null, note: null }] }),
    });

    expect(result.merged.emails.map((e) => e.value)).toEqual(["p@acme.com", "priya@home.com"]);
    expect(result.conflicts).toEqual([]);
  });

  it("reports no changes at all when nothing moved", () => {
    // Guards the idle path: a no-op sync must not queue a write to either side.
    const same = contact({ phones: [phone("111")] });
    const result = mergeSyncedContact({ base: same, local: same, remote: same });

    expect(result.conflicts).toEqual([]);
    expect(result.changedLocally).toEqual([]);
    expect(result.changedRemotely).toEqual([]);
  });
});
