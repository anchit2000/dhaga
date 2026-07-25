import { describe, expect, it } from "vitest";
import { createContactProfile, listContactsPage, setStarred } from "@/lib/repo/contacts";
import { emptyContactProfile, type ContactProfile } from "@dhaga/core";

function profile(name: string): ContactProfile {
  return { ...emptyContactProfile(), name };
}

/**
 * Starring is a manual favourite (distinct from the watch/signals opt-in) that
 * powers the Saved page's Starred tab and the home tile. It must be an explicit,
 * ISOLATED flag: setting it on one contact never touches another, new contacts
 * are un-starred by default, and the `starred` filter returns exactly the
 * starred set. A regression here silently shows the wrong people as favourites.
 */
describe("starred favourites", () => {
  it("setStarred flips only the target and drives the starred filter", async () => {
    const aliceId = await createContactProfile(profile("Alice Star"), "manual");
    await createContactProfile(profile("Bob Plain"), "manual");

    // New contacts default to un-starred → absent from the starred collection.
    expect((await listContactsPage({ page: 1, pageSize: 25, starred: true, name: "Alice Star" })).total).toBe(0);

    await setStarred(aliceId, true);

    const starredAlice = await listContactsPage({ page: 1, pageSize: 25, starred: true, name: "Alice Star" });
    expect(starredAlice.total).toBe(1);
    expect(starredAlice.rows[0]?.id).toBe(aliceId);
    expect(starredAlice.rows[0]?.starred).toBe(true);
    // Starring Alice must not star Bob.
    expect((await listContactsPage({ page: 1, pageSize: 25, starred: true, name: "Bob Plain" })).total).toBe(0);

    // Un-starring removes her from the collection again.
    await setStarred(aliceId, false);
    expect((await listContactsPage({ page: 1, pageSize: 25, starred: true, name: "Alice Star" })).total).toBe(0);
  });
});
