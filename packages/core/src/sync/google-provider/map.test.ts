import { describe, expect, it } from "vitest";

import { personToSyncable, syncableToPerson, updateMaskFor } from "./map";
import type { SyncableContact } from "../types";

/**
 * The field mask is the dangerous part of this mapping. People's updateContact
 * REPLACES every collection named in `updatePersonFields` and ignores every
 * collection that is not — so a mask wider than the payload silently deletes
 * data the user still has, and a mask narrower than the payload silently drops
 * the write. These tests pin both edges.
 */

function contact(over: Partial<SyncableContact> = {}): SyncableContact {
  return {
    name: "Priya Sharma",
    nickname: null,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
    ...over,
  };
}

describe("updateMaskFor", () => {
  it("names only the collections being written", () => {
    // The whole safety property: patching a phone number must not put `names`
    // or `addresses` in the mask, or People would clear them.
    expect(updateMaskFor({ phones: [] })).toBe("phoneNumbers");
    expect(updateMaskFor({ name: "x" })).toBe("names");
  });

  it("covers both date collections when importantDates moves", () => {
    // Birthdays and other events live in two different People collections, so a
    // date write that masked only one would leave the other stale.
    expect(updateMaskFor({ importantDates: [] }).split(",").sort()).toEqual(["birthdays", "events"]);
  });

  it("does not repeat organizations when title and company both move", () => {
    // Both map to the SAME collection; a duplicated mask entry is rejected by
    // People rather than merely being untidy.
    expect(updateMaskFor({ title: "VP", company: "Acme" })).toBe("organizations");
  });
});

describe("syncableToPerson", () => {
  it("sends company alongside a title-only change", () => {
    // organizations is one collection holding both. Writing the title without
    // the company would erase the company sitting beside it — the single most
    // destructive thing this mapping could get wrong.
    const person = syncableToPerson({ title: "VP Engineering", company: "Acme" });
    expect(person.organizations).toEqual([{ name: "Acme", title: "VP Engineering" }]);
  });

  it("clears a collection with an empty array, never by omission", () => {
    // A field the user emptied must be sent as [] so People clears it. Omitting
    // it would leave the old value in place and the deletion would never stick.
    expect(syncableToPerson({ nickname: null }).nicknames).toEqual([]);
  });

  it("keeps an unparseable birthday as text rather than inventing a date", () => {
    // Imports and note extraction produce fuzzy dates. Guessing a day number
    // would fire a reminder on the wrong day every year, forever.
    const person = syncableToPerson({
      importantDates: [{ label: "Birthday", value: "sometime in June", note: null }],
    });
    expect(person.birthdays).toEqual([{ text: "sometime in June" }]);
  });

  it("drops an unparseable non-birthday rather than writing a wrong date", () => {
    // People's `events` has no text escape hatch, so the choice is "lose a fuzzy
    // anniversary" or "assert a specific wrong one". Losing it is recoverable.
    const person = syncableToPerson({
      importantDates: [{ label: "Anniversary", value: "next spring", note: null }],
    });
    expect(person.events).toEqual([]);
  });

  it("degrades an unknown label to a type People will accept", () => {
    // People rejects an unknown `type` outright, which would fail the whole
    // write — one odd label must not cost the user every other field.
    const person = syncableToPerson({
      phones: [{ value: "+91 98765 43210", label: "Weekend cottage", note: null }],
    });
    expect(person.phoneNumbers?.[0]?.type).toBe("other");
  });
});

describe("personToSyncable", () => {
  it("reads a year-less birthday back without inventing a year", () => {
    // "Birthday, year unknown" is the normal address-book case. Round-tripping
    // it through a real year would silently assert the person's age.
    const result = personToSyncable({ birthdays: [{ date: { month: 6, day: 1 } }] });
    expect(result.importantDates).toEqual([{ label: "Birthday", value: "--06-01", note: null }]);
  });

  it("prefers the human label Google renders over its enum", () => {
    const result = personToSyncable({
      emailAddresses: [{ value: "p@acme.com", type: "work", formattedType: "Work" }],
    });
    expect(result.emails[0]?.label).toBe("Work");
  });

  it("survives a person with no fields at all", () => {
    // People omits absent collections entirely rather than returning nulls, and
    // a contact with only a resourceName is a real thing Google returns.
    expect(personToSyncable({})).toEqual(contact({ name: "" }));
  });
});
