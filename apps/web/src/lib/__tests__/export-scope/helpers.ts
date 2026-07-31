import { getDb } from "@/lib/db/request-scope";
import { contactLinks, contacts } from "@/lib/db/schema";

/**
 * Fixtures for the export-scope tests: one contact per provenance the scope
 * filter has to tell apart, plus the links that decide what a seed may offer.
 * Each test file boots its own in-memory PGlite, so each seeds its own copy.
 */

export const AUTHORED = "Scope Authored Alpha";
export const LINKED = "Scope Authored Linked";
export const TOMBSTONED = "Scope Authored Tombstoned";
export const IMPORTED = "Scope Imported Person";
export const MENTIONED = "Scope Mentioned Stub";

interface Seed {
  id: string;
  name: string;
  source: string;
}

const SEEDS: Seed[] = [
  { id: "scope-authored", name: AUTHORED, source: "manual" },
  { id: "scope-linked", name: LINKED, source: "quick_add" },
  { id: "scope-tombstoned", name: TOMBSTONED, source: "manual" },
  { id: "scope-imported", name: IMPORTED, source: "import" },
  { id: "scope-mentioned", name: MENTIONED, source: "mentioned" },
  // Nameless rows exist (a bare graph stub, a half-finished row). An
  // address-book record with no name is a blank on every device it reaches.
  { id: "scope-nameless", name: "", source: "manual" },
];

export async function seedScopeFixtures(): Promise<void> {
  const db = await getDb();
  for (const seed of SEEDS) {
    await db
      .insert(contacts)
      .values({ ...seed, emails: [], phones: [], links: [], tags: [] });
  }
  await db.insert(contactLinks).values([
    {
      id: "scope-link-live",
      contactId: "scope-linked",
      provider: "device",
      externalId: "device-1",
      state: "linked",
    },
    // Tombstoned: the user deleted this person on their phone.
    {
      id: "scope-link-dead",
      contactId: "scope-tombstoned",
      provider: "device",
      externalId: "device-2",
      state: "unlinked",
    },
    // A different provider must not filter a device seed.
    {
      id: "scope-link-other",
      contactId: "scope-authored",
      provider: "google",
      externalId: "google-1",
      state: "linked",
    },
  ]);
}
