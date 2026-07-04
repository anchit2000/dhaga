import { describe, expect, it } from "vitest";
import { importContacts } from "@/lib/repo/import";
import { getContact, listContacts } from "@/lib/repo/contacts";
import { listNotes } from "@/lib/repo/notes";
import { linkClusterToCompany, tagCluster } from "@/lib/repo/suggestions";
import type { ImportCandidate } from "@/lib/import";

const candidate = (
  name: string,
  company: string | null,
  emails: string[] = [],
): ImportCandidate => ({
  contact: { name, title: null, company, emails, phones: [], links: [], location: null },
  receipt: `Imported from LinkedIn Connections export · connected 1 Jan 2026`,
});

async function findByName(name: string) {
  const people = await listContacts(name);
  expect(people.length).toBeGreaterThan(0);
  return people[0];
}

/**
 * Import trust story: every imported contact carries a receipt note, and
 * re-importing a newer export never duplicates people (the LinkedIn
 * re-import path, BRD §6.7).
 */
describe("bulk import", () => {
  it("creates contacts with company link and a capture_source receipt", async () => {
    const summary = await importContacts(
      [candidate("Import One", "Freightline GmbH", ["one@import.example"])],
      "linkedin",
    );
    expect(summary).toEqual({ created: 1, skipped: 0 });

    const row = await findByName("Import One");
    expect(row.companyName).toBe("Freightline GmbH");
    const notes = await listNotes(row.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].kind).toBe("capture_source");
    expect(notes[0].body).toContain("LinkedIn Connections");
  });

  it("skips on re-import — by email, and by name+company when email is missing", async () => {
    await importContacts(
      [
        candidate("Import Two", "Acme", ["two@import.example"]),
        candidate("Import Three", "Acme"),
      ],
      "linkedin",
    );
    const again = await importContacts(
      [
        // Same email, name spelled differently — still the same person.
        candidate("Import Two Renamed", "Acme", ["two@import.example"]),
        candidate("Import Three", "Acme"),
      ],
      "linkedin",
    );
    expect(again).toEqual({ created: 0, skipped: 2 });
  });

  it("dedupes inside a single file too", async () => {
    const summary = await importContacts(
      [
        candidate("Import Four", null, ["four@import.example"]),
        candidate("Import Four Again", null, ["four@import.example"]),
      ],
      "google",
    );
    expect(summary).toEqual({ created: 1, skipped: 1 });
  });
});

describe("confirmed cluster suggestions", () => {
  it("tags every member once, idempotently", async () => {
    await importContacts([candidate("Priya Jain", null), candidate("Rahul Jain", null)], "google");
    const priya = await findByName("Priya Jain");
    const rahul = await findByName("Rahul Jain");

    expect(await tagCluster("jain", [priya.id, rahul.id])).toBe(2);
    expect(await tagCluster("jain", [priya.id, rahul.id])).toBe(0);
    const detail = await getContact(priya.id);
    expect(detail?.contact.tags).toContain("jain");
  });

  it("links only members without a company — never overwrites existing data", async () => {
    await importContacts(
      [
        candidate("Anchit JOGET", null),
        candidate("Arjit JOGET", "Existing Employer"),
      ],
      "google",
    );
    const anchit = await findByName("Anchit JOGET");
    const arjit = await findByName("Arjit JOGET");

    const linked = await linkClusterToCompany("Joget", [anchit.id, arjit.id]);
    expect(linked).toBe(1);
    expect((await getContact(anchit.id))?.companyName).toBe("Joget");
    expect((await getContact(arjit.id))?.companyName).toBe("Existing Employer");
  });
});
