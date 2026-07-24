import { describe, expect, it } from "vitest";
import type { Contact } from "expo-contacts/legacy";
// The device→profile mapper lives in the mobile app but is a pure function with
// no React Native runtime imports, so it is unit-tested here where vitest runs
// (the mobile app has no test runner of its own yet).
import { deviceContactToCandidate } from "../../../../mobile/src/lib/contacts/map";

/** A realistic device contact: labeled email/phone, employment, and a birthday. */
const RICH_CONTACT: Contact = {
  contactType: "person",
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  nickname: "Countess",
  company: "Analytical Engines",
  jobTitle: "Mathematician",
  department: "Research",
  note: "Met at the Difference Engine demo",
  birthday: { day: 10, month: 11, year: 1815 }, // month is 0-based → December
  emails: [{ email: "ada@example.com", label: "work", id: "e1" }],
  phoneNumbers: [{ number: "+1 555 0100", label: "mobile", id: "p1" }],
  addresses: [{ street: "1 Engine Way", city: "London", label: "home", id: "a1" }],
};

describe("deviceContactToCandidate", () => {
  it("maps labeled methods, position, and birthday, and keeps a receipt", () => {
    const result = deviceContactToCandidate(RICH_CONTACT);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.contact.name).toBe("Ada Lovelace");
    expect(result.contact.nickname).toBe("Countess");

    // Labels are capitalized ("work" → "Work", "mobile" → "Mobile").
    expect(result.contact.emails).toEqual([
      { value: "ada@example.com", label: "Work", note: null },
    ]);
    expect(result.contact.phones).toEqual([
      { value: "+1 555 0100", label: "Mobile", note: null },
    ]);

    // company + jobTitle + department collapse into one current position.
    expect(result.contact.positions).toEqual([
      {
        title: "Mathematician",
        company: "Analytical Engines",
        department: "Research",
        current: true,
        startedAt: null,
        endedAt: null,
        note: null,
      },
    ]);

    // 0-based month 11 → December (12); year present → ISO.
    expect(result.contact.importantDates).toEqual([
      { label: "Birthday", value: "1815-12-10", note: null },
    ]);

    expect(result.contact.addresses[0]).toMatchObject({ city: "London", label: "Home" });

    // The note rides along in the receipt so its provenance is preserved.
    expect(result.receipt).toContain("Imported from device contacts");
    expect(result.receipt).toContain("Met at the Difference Engine demo");
  });

  it("returns null for a nameless contact (nothing worth importing)", () => {
    const nameless: Contact = { contactType: "person", name: "" };
    expect(deviceContactToCandidate(nameless)).toBeNull();
  });
});
