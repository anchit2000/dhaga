import { describe, expect, it } from "vitest";

import { graphToSyncable, MICROSOFT_UNSUPPORTED_FIELDS, syncableToGraph } from "./map";
import { capabilitiesFromScope } from "./auth";

/**
 * Graph models a contact far more rigidly than People. These tests pin the two
 * consequences that would otherwise lose user data: the fields that cannot
 * cross must be DECLARED (not silently reported empty), and no phone may be
 * dropped just because its label has nowhere to live.
 */

describe("Microsoft unsupported fields", () => {
  it("declares every field Graph cannot represent as a list", () => {
    // This list is load-bearing, not documentation. Graph has ONE url slot, ONE
    // birthday and THREE fixed address slots. If a field were removed from here
    // it would start reading back short, and on the second run — once the base
    // snapshot recorded the full value as synced — the merge would honour the
    // shortfall as a deliberate deletion.
    expect([...MICROSOFT_UNSUPPORTED_FIELDS].sort()).toEqual([
      "addresses",
      "importantDates",
      "links",
    ]);
  });

  it("reports those fields empty so the neutraliser has something to replace", () => {
    const result = graphToSyncable({ id: "1", displayName: "Priya" });
    expect(result.links).toEqual([]);
    expect(result.addresses).toEqual([]);
    expect(result.importantDates).toEqual([]);
  });
});

describe("phone bucketing", () => {
  it("keeps every number even when labels have nowhere to go", () => {
    // Graph offers one mobile slot and two arrays. A second Mobile number, or
    // an oddly-labelled one, must still be written — losing a phone number is
    // exactly the failure two-way sync exists to prevent.
    const graph = syncableToGraph({
      phones: [
        { value: "111", label: "Mobile", note: null },
        { value: "222", label: "Mobile", note: null },
        { value: "333", label: "Weekend cottage", note: null },
        { value: "444", label: "Home", note: null },
      ],
    });
    const written = [graph.mobilePhone, ...(graph.businessPhones ?? []), ...(graph.homePhones ?? [])]
      .filter(Boolean)
      .sort();
    expect(written).toEqual(["111", "222", "333", "444"]);
  });

  it("round-trips the three buckets back into labelled methods", () => {
    const result = graphToSyncable({
      id: "1",
      displayName: "Priya",
      mobilePhone: "111",
      businessPhones: ["222"],
      homePhones: ["333"],
    });
    expect(result.phones).toEqual([
      { value: "111", label: "Mobile", note: null },
      { value: "222", label: "Work", note: null },
      { value: "333", label: "Home", note: null },
    ]);
  });
});

describe("syncableToGraph", () => {
  it("sends only the fields it was given", () => {
    // Graph PATCH is already partial, so an extra key here would overwrite a
    // property Dhaga does not manage.
    expect(Object.keys(syncableToGraph({ title: "VP" }))).toEqual(["jobTitle"]);
  });

  it("clears a scalar with an empty string rather than omitting it", () => {
    // Omission means "leave alone" to Graph, so a cleared title has to be sent
    // explicitly or the deletion never lands.
    expect(syncableToGraph({ title: null }).jobTitle).toBe("");
  });
});

describe("capabilitiesFromScope", () => {
  it("treats ReadWrite as granting both", () => {
    expect(capabilitiesFromScope("Contacts.ReadWrite")).toEqual({ read: true, write: true });
  });

  it("accepts the full-URI form some tenants echo", () => {
    // Graph returns scopes as bare names on some tenants and as
    // https://graph.microsoft.com/… URIs on others; missing that would silently
    // downgrade a working connection to no-access.
    expect(capabilitiesFromScope("https://graph.microsoft.com/Contacts.ReadWrite")).toEqual({
      read: true,
      write: true,
    });
  });

  it("never infers write from a read grant", () => {
    expect(capabilitiesFromScope("Contacts.Read")).toEqual({ read: true, write: false });
  });

  it("defaults a missing scope to no access", () => {
    expect(capabilitiesFromScope(null)).toEqual({ read: false, write: false });
  });
});
