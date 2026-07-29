import { describe, expect, it } from "vitest";

import { valueToDeviceDate } from "../fields/dates";
import { detailsToSyncable } from "../fields/read";
import { splitName, syncableToLegacyContact, syncableToPatch } from "../fields/write";

import type { SyncableContact } from "@dhaga/core/src/sync/types";
import type { SyncDetails } from "../fields/types";

/** A realistic modern-API record: months here are 1–12, unlike the legacy API. */
const DEVICE: SyncDetails = {
  id: "device-1",
  fullName: "Ada Byron Lovelace",
  givenName: "Ada",
  familyName: "Lovelace",
  nickname: "Countess",
  company: "Analytical Engines",
  jobTitle: "Mathematician",
  emails: [{ id: "e1", label: "work", address: "ada@example.com" }],
  phones: [{ id: "p1", label: "mobile", number: "+44 20 7946 0000" }],
  urlAddresses: [{ id: "u1", label: "homepage", url: "https://example.com" }],
  addresses: [
    { id: "a1", label: "home", street: "12 Analytical Way", city: "London", state: "England", postcode: "EC1", country: "UK" },
  ],
  birthday: { year: 1815, month: 12, day: 10 },
  dates: [{ id: "d1", label: "anniversary", date: { month: 7, day: 8 } }],
};

const DHAGA: SyncableContact = {
  name: "Ada Lovelace",
  nickname: "Countess",
  title: "Mathematician",
  company: "Analytical Engines",
  emails: [{ value: "ada@example.com", label: "Work", note: null }],
  phones: [],
  links: [],
  addresses: [],
  importantDates: [{ label: "Birthday", value: "1815-12-10", note: null }],
};

describe("detailsToSyncable", () => {
  it("reads the modern API's 1-based month without shifting it", () => {
    // The legacy device mapper (@/lib/contacts/map) adds 1 because the legacy
    // API counts months from 0. Reusing that here would move every birthday.
    expect(detailsToSyncable(DEVICE).importantDates).toEqual([
      { label: "Birthday", value: "1815-12-10", note: null },
      { label: "Anniversary", value: "07-08", note: null },
    ]);
  });

  it("maps only the fields Dhaga manages, with labels title-cased", () => {
    const contact = detailsToSyncable(DEVICE);
    expect(contact.name).toBe("Ada Byron Lovelace");
    expect(contact.title).toBe("Mathematician");
    expect(contact.company).toBe("Analytical Engines");
    expect(contact.emails).toEqual([{ value: "ada@example.com", label: "Work", note: null }]);
    expect(contact.links).toEqual([
      { value: "https://example.com", label: "Homepage", note: null },
    ]);
    expect(contact.addresses[0]).toMatchObject({ region: "England", postalCode: "EC1" });
  });

  it("falls back to Android's extraNames for the nickname", () => {
    // The `nickname` scalar is iOS-only; Android keeps nicknames in a list, so
    // reading only the scalar would silently drop it on half the userbase.
    const android: SyncDetails = { ...DEVICE, nickname: null, extraNames: [{ id: "n1", name: "Countess" }] };
    expect(detailsToSyncable(android).nickname).toBe("Countess");
  });

  it("drops an unlabelled date rather than inventing a label", () => {
    const unlabelled: SyncDetails = { ...DEVICE, birthday: null, dates: [{ id: "d2", date: { month: 3, day: 1 } }] };
    expect(detailsToSyncable(unlabelled).importantDates).toEqual([]);
  });
});

describe("splitName", () => {
  it("writes every name part so no stale middle name survives", () => {
    // patch() only touches supplied keys; setting given+family alone would
    // leave an old middleName behind and corrupt the OS-rendered full name.
    expect(splitName("Ada Byron Lovelace")).toEqual({
      givenName: "Ada",
      middleName: "Byron",
      familyName: "Lovelace",
    });
    expect(splitName("Ada Lovelace")).toEqual({
      givenName: "Ada",
      middleName: null,
      familyName: "Lovelace",
    });
    expect(splitName("Prince")).toEqual({ givenName: "Prince", middleName: null, familyName: null });
  });
});

describe("syncableToPatch", () => {
  it("emits keys ONLY for the fields the server sent", () => {
    // An unsent field must stay absent. Emitting it as null would erase a value
    // Dhaga does not own — the exact clobbering the partial contract forbids.
    const patch = syncableToPatch({ title: "Countess of Lovelace" }, "ios");
    expect(Object.keys(patch)).toEqual(["jobTitle"]);
    expect(patch.jobTitle).toBe("Countess of Lovelace");
  });

  it("passes an explicit null through as a clear", () => {
    expect(syncableToPatch({ company: null }, "ios")).toEqual({ company: null });
  });

  it("routes the nickname into extraNames on Android", () => {
    expect(syncableToPatch({ nickname: "Countess" }, "android")).toEqual({
      extraNames: [{ name: "Countess" }],
    });
    expect(syncableToPatch({ nickname: "Countess" }, "ios")).toEqual({ nickname: "Countess" });
  });

  it("splits a birthday out of importantDates into the dedicated slot", () => {
    const patch = syncableToPatch(
      {
        importantDates: [
          { label: "Birthday", value: "1815-12-10", note: null },
          { label: "Anniversary", value: "07-08", note: null },
          { label: "Met", value: "spring 2019", note: null },
        ],
      },
      "ios",
    );
    expect(patch.birthday).toEqual({ year: 1815, month: 12, day: 10 });
    // "spring 2019" has no address-book representation and is dropped, not guessed.
    expect(patch.dates).toEqual([{ label: "anniversary", date: { month: 7, day: 8 } }]);
  });
});

describe("valueToDeviceDate", () => {
  it("refuses verbatim dates instead of guessing a day", () => {
    expect(valueToDeviceDate("spring 2019")).toBeNull();
    expect(valueToDeviceDate("2019")).toBeNull();
    expect(valueToDeviceDate("1815-13-10")).toBeNull();
  });
});

describe("syncableToLegacyContact", () => {
  it("converts the month to the legacy API's 0-based counting", () => {
    // addContactAsync is the only call that can target a container, and it
    // takes months 0–11. Handing it a 1-based month files December as January.
    expect(syncableToLegacyContact(DHAGA)?.birthday).toEqual({ day: 10, month: 11, year: 1815 });
  });

  it("carries the fields the address book can hold", () => {
    const record = syncableToLegacyContact(DHAGA);
    expect(record).toMatchObject({
      contactType: "person",
      name: "Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
      jobTitle: "Mathematician",
      company: "Analytical Engines",
      emails: [{ email: "ada@example.com", label: "work" }],
    });
  });

  it("refuses a nameless contact", () => {
    // A nameless address-book entry is unfindable by the user; the caller
    // reports it as a failed write instead of creating a blank card.
    expect(syncableToLegacyContact({ ...DHAGA, name: "   " })).toBeNull();
  });
});
