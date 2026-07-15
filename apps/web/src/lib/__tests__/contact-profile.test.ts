import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { positions } from "@/lib/db/schema";
import {
  createContactProfile,
  forgetContact,
  getContact,
  getContactProfile,
  updateContact,
} from "@/lib/repo/contacts";
import { emptyContactProfile, type ContactProfile } from "@dhaga/core";

function profile(overrides: Partial<ContactProfile>): ContactProfile {
  return { ...emptyContactProfile(), ...overrides };
}

/**
 * People are rarely one job / one number. These encode the *why* of the rich
 * model: employment is a list whose current role still drives the denormalised
 * title/company reads the rest of the app depends on; contact methods keep
 * their labels; and editing replaces the whole list rather than appending
 * ghosts. A regression in any of those silently loses a user's data.
 */
describe("rich contact profile", () => {
  it("keeps every job but mirrors the current one into title/company", async () => {
    const id = await createContactProfile(
      profile({
        name: "Maya Iyer",
        positions: [
          { title: "Advisor", company: "Oldco", department: null, current: false, startedAt: "2018", endedAt: "2021", note: null },
          { title: "Head of Growth", company: "Newco", department: "Marketing", current: true, startedAt: "2021", endedAt: null, note: null },
        ],
        emails: [
          { value: "maya@newco.com", label: "Work", note: null },
          { value: "maya@gmail.com", label: "Personal", note: "preferred" },
        ],
      }),
      "manual",
    );

    const detail = await getContact(id);
    // Primary = first current role → mirrored onto the row the list/graph read.
    expect(detail?.contact.title).toBe("Head of Growth");
    expect(detail?.companyName).toBe("Newco");
    // Full history preserved, ordered, joined to company names.
    expect(detail?.positions.map((p) => `${p.title} @ ${p.companyName}`)).toEqual([
      "Advisor @ Oldco",
      "Head of Growth @ Newco",
    ]);
    // Labels + notes survive the round-trip — the point of the change.
    expect(detail?.contact.emails).toEqual([
      { value: "maya@newco.com", label: "Work", note: null },
      { value: "maya@gmail.com", label: "Personal", note: "preferred" },
    ]);
  });

  it("replaces the whole job list on edit and re-derives the primary", async () => {
    const id = await createContactProfile(
      profile({
        name: "Dev Rao",
        positions: [{ title: "Intern", company: "Acme", department: null, current: true, startedAt: null, endedAt: null, note: null }],
      }),
      "manual",
    );
    expect((await getContactProfile(id))?.positions).toHaveLength(1);

    await updateContact(
      id,
      profile({
        name: "Dev Rao",
        positions: [
          { title: "Intern", company: "Acme", department: null, current: false, startedAt: null, endedAt: "2024", note: null },
          { title: "Founder", company: "Devco", department: null, current: true, startedAt: "2024", endedAt: null, note: null },
        ],
      }),
    );

    const detail = await getContact(id);
    expect(detail?.contact.title).toBe("Founder");
    expect(detail?.companyName).toBe("Devco");
    // Exactly two rows — the old single Intern row is gone, not orphaned.
    const db = await getDb();
    const rows = await db.select().from(positions).where(eq(positions.contactId, id));
    expect(rows).toHaveLength(2);
  });

  it("persists addresses / dates / custom fields and cascades positions on forget", async () => {
    const id = await createContactProfile(
      profile({
        name: "Noor Ali",
        positions: [{ title: "PM", company: "Globex", department: null, current: true, startedAt: null, endedAt: null, note: null }],
        addresses: [{ label: "Home", street: "1 Elm St", city: "Austin", region: "TX", postalCode: "78701", country: "US", note: null }],
        importantDates: [{ label: "Birthday", value: "1991-03-02", note: null }],
        customFields: [{ label: "Signal", value: "@noor" }],
      }),
      "manual",
    );

    const loaded = await getContactProfile(id);
    expect(loaded?.addresses[0]?.city).toBe("Austin");
    expect(loaded?.importantDates[0]).toEqual({ label: "Birthday", value: "1991-03-02", note: null });
    expect(loaded?.customFields[0]).toEqual({ label: "Signal", value: "@noor" });

    await forgetContact(id);
    const db = await getDb();
    const rows = await db.select().from(positions).where(eq(positions.contactId, id));
    expect(rows).toHaveLength(0);
    expect(await getContact(id)).toBeNull();
  });
});
