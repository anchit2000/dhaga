import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, signals } from "@/lib/db/schema";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { createSession, addContactToSession } from "@/lib/repo/sessions";
import { hybridSearch } from "@/lib/repo/search";
import { emptyExtractedContact, type ExtractedContact, type NoteExtraction } from "@dhaga/core";

function contact(overrides: Partial<ExtractedContact>): ExtractedContact {
  return { ...emptyExtractedContact(), ...overrides };
}

/**
 * Before this change, hybridSearch's keyword phase only looked at
 * name/title/company/tags/facts/notes — a contact findable only by their
 * email, phone, a company's domain/sector, a follow-up, a session they
 * attended, or a proactive-intelligence signal was invisible to plain
 * keyword search (and, with embeddings off, invisible to search at all).
 * Each case below seeds a contact discoverable through exactly one such
 * field, proving the gap is closed rather than just re-testing what
 * search-seeded.test.ts already covers.
 */
describe("hybridSearch covers every searchable field, not just name/title/facts/notes", () => {
  let emailContact: string;
  let phoneContact: string;
  let linkContact: string;
  let locationContact: string;
  let domainContact: string;
  let sectorContact: string;
  let followUpContact: string;
  let sessionContact: string;
  let signalContact: string;

  beforeAll(async () => {
    emailContact = await createContact(
      contact({ name: "Iris Kowalski", emails: ["iris@quantumforge.io"] }),
      "manual",
    );
    phoneContact = await createContact(
      contact({ name: "Marcus Webb", phones: ["+1-415-555-0199"] }),
      "manual",
    );
    linkContact = await createContact(
      contact({ name: "Tomoko Sato", links: ["linkedin.com/in/nebulaworks-tomoko"] }),
      "manual",
    );
    locationContact = await createContact(
      contact({ name: "Femi Adeyemi", location: "Lagos" }),
      "manual",
    );

    const domainCompanyId = await findOrCreateCompany("Umbra Robotics");
    const db = await getDb();
    await db
      .update(companies)
      .set({ domain: "umbrarobotics.dev" })
      .where(eq(companies.id, domainCompanyId));
    domainContact = await createContact(
      contact({ name: "Nadia Petrov", company: "Umbra Robotics" }),
      "manual",
    );

    const sectorCompanyId = await findOrCreateCompany("Coral Biotech");
    await db
      .update(companies)
      .set({ sector: "biotechnology" })
      .where(eq(companies.id, sectorCompanyId));
    sectorContact = await createContact(
      contact({ name: "Leo Fontaine", company: "Coral Biotech" }),
      "manual",
    );

    followUpContact = await createContact(contact({ name: "Priya Deshmukh" }), "manual");
    const followUpNoteId = await addNote(followUpContact, "text", "Placeholder note");
    const extraction: NoteExtraction = {
      facts: [],
      relationships: [],
      follow_ups: [{ action: "Send the pricing deck for the payments rollout", due_hint: null }],
      tags: [],
    };
    await applyExtraction(followUpContact, followUpNoteId, extraction);

    sessionContact = await createContact(contact({ name: "Oscar Lindqvist" }), "manual");
    const sessionId = await createSession("Helioscope Robotics Expo");
    await addContactToSession(sessionId, sessionContact);

    signalContact = await createContact(contact({ name: "Ana Reyes" }), "manual");
    await db.insert(signals).values({
      id: "test-signal-1",
      contactId: signalContact,
      kind: "job_change",
      headline: "Promoted to VP of Platform Engineering",
      detail: "Moved from Staff Engineer to VP of Platform Engineering at her company.",
      status: "new",
    });
  });

  it("finds a contact by email", async () => {
    const hits = await hybridSearch("quantumforge");
    expect(hits.map((h) => h.contactId)).toContain(emailContact);
  });

  it("finds a contact by a phone number fragment", async () => {
    // Trigram/ILIKE substring matching, not digit-normalized — a query must
    // align with how the number is punctuated, same as the stored value.
    const hits = await hybridSearch("555-0199");
    expect(hits.map((h) => h.contactId)).toContain(phoneContact);
  });

  it("finds a contact by a link/URL fragment", async () => {
    const hits = await hybridSearch("nebulaworks");
    expect(hits.map((h) => h.contactId)).toContain(linkContact);
  });

  it("finds a contact by location", async () => {
    const hits = await hybridSearch("Lagos");
    expect(hits.map((h) => h.contactId)).toContain(locationContact);
  });

  it("finds a contact by their company's domain", async () => {
    const hits = await hybridSearch("umbrarobotics");
    expect(hits.map((h) => h.contactId)).toContain(domainContact);
  });

  it("finds a contact by their company's sector", async () => {
    const hits = await hybridSearch("biotechnology");
    expect(hits.map((h) => h.contactId)).toContain(sectorContact);
  });

  it("finds a contact by an open follow-up", async () => {
    const hits = await hybridSearch("pricing deck payments");
    expect(hits.map((h) => h.contactId)).toContain(followUpContact);
  });

  it("finds a contact by a session they attended", async () => {
    const hits = await hybridSearch("Helioscope Robotics Expo");
    expect(hits.map((h) => h.contactId)).toContain(sessionContact);
  });

  it("finds a contact by a proactive-intelligence signal", async () => {
    const hits = await hybridSearch("Platform Engineering promoted");
    expect(hits.map((h) => h.contactId)).toContain(signalContact);
  });

  it("live-typing a partial prefix still matches (prefix tsquery)", async () => {
    const hits = await hybridSearch("Lago");
    expect(hits.map((h) => h.contactId)).toContain(locationContact);
  });
});
