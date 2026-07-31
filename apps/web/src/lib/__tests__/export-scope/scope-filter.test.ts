import { beforeAll, describe, expect, it, vi } from "vitest";
import { exportContacts } from "@/lib/export/data";
import {
  AUTHORED,
  IMPORTED,
  LINKED,
  MENTIONED,
  TOMBSTONED,
  seedScopeFixtures,
} from "./helpers";
import type { ExportContactsOptions } from "@/lib/export/data";

// The route gates on the session; the repo layer under test is tenant-agnostic
// (RLS scoping is EE's job), so a fixed user id suffices.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
  requireUserIdForPage: async () => "test-user",
  requireUserIdFromRequest: async () => "test-user",
}));

async function names(options?: ExportContactsOptions): Promise<string[]> {
  return (await exportContacts(options)).map((row) => row.name);
}

beforeAll(seedScopeFixtures);

/**
 * The contact export does two jobs with one query, and they pull in opposite
 * directions: the default download is the "you can always leave with all your
 * data" guarantee (M8), while `scope=authored` is the file a user is told to
 * import into their phone. Whatever the second one filters, the first must not.
 */
describe("exportContacts scopes", () => {
  it("returns every contact by default, whatever its provenance", async () => {
    const all = await names();
    expect(all).toEqual(expect.arrayContaining([AUTHORED, LINKED, TOMBSTONED, IMPORTED, MENTIONED]));
    expect(all.filter((name) => name === "")).toHaveLength(1);
  });

  it("drops inferred stubs, re-imports and nameless rows under scope=authored", async () => {
    const authored = await names({ scope: "authored" });
    expect(authored).toEqual(expect.arrayContaining([AUTHORED, LINKED, TOMBSTONED]));
    // Inferred data must never be written into an external address book, and a
    // re-import would replay every list the user has ever uploaded.
    expect(authored).not.toContain(MENTIONED);
    expect(authored).not.toContain(IMPORTED);
    expect(authored).not.toContain("");
  });

  it("drops contacts already linked on the named provider, tombstoned links included", async () => {
    // The point of the provider filter: someone who already synced part of
    // their graph seeds the remainder instead of importing duplicates.
    const seed = await names({ scope: "authored", provider: "device" });
    expect(seed).toContain(AUTHORED);
    expect(seed).not.toContain(LINKED);
    // A link the sweep tombstoned means the user deleted that person on the
    // phone. Re-seeding them would undo that as surely as a sync create would.
    expect(seed).not.toContain(TOMBSTONED);
  });

  it("scopes the link filter to one provider", async () => {
    // AUTHORED is linked on google, so a google seed must skip it while a
    // device seed still offers it (asserted above).
    expect(await names({ scope: "authored", provider: "google" })).not.toContain(AUTHORED);
  });
});
