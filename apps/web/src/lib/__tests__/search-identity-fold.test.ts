import { beforeAll, describe, expect, it } from "vitest";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { createEvent, addContactToEvent } from "@/lib/repo/events";
import { hybridSearch } from "@/lib/repo/search";
import { emptyExtractedContact, type ExtractedContact } from "@dhaga/core";

function contact(overrides: Partial<ExtractedContact>): ExtractedContact {
  return { ...emptyExtractedContact(), ...overrides };
}

/**
 * The keyword phase now folds all six sources plus the contact/company identity
 * lookup into one query (repo/search/keyword/combined) — identity rides along
 * on every branch instead of a separate follow-up round-trip. So a contact
 * surfaced ONLY by a note or an event they attended (their name never matches
 * the query) must still come back with its name/title/company populated on the
 * result. If the identity fold regressed, the contactId would still be present
 * — which every other search test asserts — but the card would render nameless.
 */
describe("hybridSearch folds identity onto non-name matches", () => {
  let noteOnly: string;
  let eventOnly: string;

  beforeAll(async () => {
    const companyId = await findOrCreateCompany("Meridian Freight");
    noteOnly = await createContact(
      contact({ name: "Bartholomew Achterberg", title: "Logistics Lead", company: "Meridian Freight" }),
      "manual",
    );
    expect(companyId).toBeTruthy();
    await addNote(noteOnly, "text", "Discussed the palladium-catalyst supply route at length.");

    eventOnly = await createContact(contact({ name: "Wilhelmina Oyelaran-Quist" }), "manual");
    const eventId = await createEvent("Antikythera Mechanism Symposium");
    await addContactToEvent(eventId, eventOnly);
  });

  it("returns full identity for a contact matched only by note text", async () => {
    const hit = (await hybridSearch("palladium catalyst")).find((h) => h.contactId === noteOnly);
    expect(hit).toBeDefined();
    expect(hit?.name).toBe("Bartholomew Achterberg");
    expect(hit?.title).toBe("Logistics Lead");
    expect(hit?.companyName).toBe("Meridian Freight");
    // The note is the receipt for why they surfaced.
    expect(hit?.matches.some((m) => m.startsWith("note: "))).toBe(true);
  });

  it("returns full identity for a contact matched only by an attended event", async () => {
    const hit = (await hybridSearch("Antikythera Mechanism")).find((h) => h.contactId === eventOnly);
    expect(hit).toBeDefined();
    expect(hit?.name).toBe("Wilhelmina Oyelaran-Quist");
    expect(hit?.matches.some((m) => m.startsWith("met at: "))).toBe(true);
  });
});
