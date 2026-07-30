import { describe, expect, it } from "vitest";
import { createContactProfile, getContact } from "@/lib/repo/contacts";
import { pushContactSync } from "@/lib/repo/sync";
import { USER, observed, profile, push, role } from "./helpers";

/**
 * `SyncableContact.company` is the organisation NAME — external address books
 * store a string — while `contacts.company_id` is an FK. Both directions of
 * that resolution happen at the repo boundary and nowhere else; the merge core
 * must never learn about company rows.
 */
describe("sync company name ↔ id", () => {
  it("reads the company as a name and writes a changed one back as an FK", async () => {
    const id = await createContactProfile(
      profile({ name: "Sync Company Person", positions: [role("Head of Ops", "Sync Freight GmbH")] }),
      "manual",
    );

    // First run links and records the base. Matching on company at all proves
    // the FK was resolved to a name on the way out.
    const first = await pushContactSync(
      USER,
      push({
        containerId: "container-company",
        contacts: [
          observed({
            externalId: "company-1",
            name: "Sync Company Person",
            title: "Head of Ops",
            company: "Sync Freight GmbH",
          }),
        ],
      }),
    );
    expect(first.linked).toBe(1);
    expect(first.conflicts).toEqual([]);

    // Second run: the employer was renamed on the device. With a base, that is
    // an unambiguous remote edit — pull it in, resolving the NAME to an FK.
    const second = await pushContactSync(
      USER,
      push({
        containerId: "container-company",
        contacts: [
          observed({
            externalId: "company-1",
            name: "Sync Company Person",
            title: "COO",
            company: "Sync Freight AG",
          }),
        ],
      }),
    );
    expect(second.pulled).toBe(1);
    expect(second.conflicts).toEqual([]);

    const detail = await getContact(id);
    expect(detail?.companyName).toBe("Sync Freight AG");
    // positions is the source of truth for employment and contacts.company_id
    // is its mirror: leaving the position stale would let the next profile save
    // silently revert the value sync just pulled in.
    expect(detail?.positions[0]?.companyName).toBe("Sync Freight AG");
    expect(detail?.positions[0]?.title).toBe("COO");
  });

  it("gives a contact with no employment a position when one arrives", async () => {
    const id = await createContactProfile(profile({ name: "Sync Jobless Person" }), "manual");
    await pushContactSync(
      USER,
      push({
        containerId: "container-jobless",
        contacts: [observed({ externalId: "jobless-1", name: "Sync Jobless Person" })],
      }),
    );
    await pushContactSync(
      USER,
      push({
        containerId: "container-jobless",
        contacts: [
          observed({
            externalId: "jobless-1",
            name: "Sync Jobless Person",
            title: "Founder",
            company: "Sync Studio",
          }),
        ],
      }),
    );

    const detail = await getContact(id);
    expect(detail?.companyName).toBe("Sync Studio");
    expect(detail?.positions).toHaveLength(1);
    expect(detail?.positions[0]?.title).toBe("Founder");
  });

  it("clearing the company on the device clears the FK, not the whole contact", async () => {
    const id = await createContactProfile(
      profile({ name: "Sync Quitter Person", positions: [role("Analyst", "Sync Bank")] }),
      "manual",
    );
    await pushContactSync(
      USER,
      push({
        containerId: "container-quit",
        contacts: [
          observed({
            externalId: "quit-1",
            name: "Sync Quitter Person",
            title: "Analyst",
            company: "Sync Bank",
          }),
        ],
      }),
    );
    await pushContactSync(
      USER,
      push({
        containerId: "container-quit",
        contacts: [
          observed({ externalId: "quit-1", name: "Sync Quitter Person", title: "Analyst" }),
        ],
      }),
    );

    const detail = await getContact(id);
    expect(detail?.companyName).toBeNull();
    expect(detail?.contact.name).toBe("Sync Quitter Person");
    expect(detail?.positions[0]?.title).toBe("Analyst");
  });
});
