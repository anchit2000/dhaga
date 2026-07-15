import { describe, expect, it } from "vitest";
import { buildProfilePayload } from "@/components/app/ContactForm/payload";
import { contactProfileSchema, emptyContactProfile, type ContactProfile } from "@dhaga/core";

function profile(overrides: Partial<ContactProfile>): ContactProfile {
  return { ...emptyContactProfile(), ...overrides };
}

/**
 * The form serializes its live state to one JSON field the server re-validates.
 * This is the seam where a stray "Add" click could persist a blank job or an
 * empty phone. buildProfilePayload must drop those and emit something
 * contactProfileSchema.parse (what the action runs) accepts unchanged.
 */
describe("buildProfilePayload", () => {
  it("trims, drops empty rows, and stays schema-valid", () => {
    const json = buildProfilePayload(
      profile({
        name: "  Ada Lovelace  ",
        positions: [
          { title: "  Analyst ", company: " Analytical Engines ", department: null, current: true, startedAt: null, endedAt: null, note: null },
          { title: "", company: "", department: null, current: false, startedAt: null, endedAt: null, note: null },
        ],
        emails: [
          { value: " ada@example.com ", label: " Work ", note: null },
          { value: "   ", label: "Home", note: null },
        ],
        importantDates: [{ label: "", value: "1815-12-10", note: null }],
        customFields: [{ label: "", value: "" }],
      }),
    );

    // Round-trips through the exact validator the server action uses.
    const parsed = contactProfileSchema.parse(JSON.parse(json));
    expect(parsed.name).toBe("Ada Lovelace");
    expect(parsed.positions).toHaveLength(1);
    expect(parsed.positions[0]).toMatchObject({ title: "Analyst", company: "Analytical Engines" });
    expect(parsed.emails).toEqual([{ value: "ada@example.com", label: "Work", note: null }]);
    expect(parsed.importantDates).toEqual([{ label: "Date", value: "1815-12-10", note: null }]);
    expect(parsed.customFields).toEqual([]);
  });
});
