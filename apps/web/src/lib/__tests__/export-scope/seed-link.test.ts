import { beforeAll, describe, expect, it, vi } from "vitest";
import { GET as exportRoute } from "@/app/api/export/[format]/route";
import { AUTHORED, IMPORTED, LINKED, MENTIONED, TOMBSTONED, seedScopeFixtures } from "./helpers";

// The route gates on the session; the repo layer under test is tenant-agnostic
// (RLS scoping is EE's job), so a fixed user id suffices.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
  requireUserIdForPage: async () => "test-user",
  requireUserIdFromRequest: async () => "test-user",
}));

/**
 * The literal the settings control emits (SeedDownload.tsx, SEED_ALL_HREF).
 * Written out rather than imported because that module is a "use client"
 * component pulling in React and Base UI; what matters is that the STRING a
 * user's browser sends is one this route answers.
 */
const SEED_ALL_HREF = "/api/export/vcard?scope=authored";

beforeAll(seedScopeFixtures);

/**
 * The first-time seed link — `scope=authored` with NO provider.
 *
 * Its own case because the provider-scoped variant is a different promise: this
 * one is for an address book where nothing is linked yet, so it must NOT filter
 * on links, and it must still refuse everything the push refuses. A silent 400
 * here would leave the only phone-reachable bulk path dead in the UI.
 */
describe("the seed download link the contact-sync settings emit", () => {
  it("is served, and carries every contact the user authored", async () => {
    const response = await exportRoute(new Request(`http://localhost${SEED_ALL_HREF}`), {
      params: Promise.resolve({ format: "vcard" }),
    });
    expect(response.status).toBe(200);
    const body = await response.text();

    // No provider means no link filtering: a contact already linked on some
    // account still belongs in a file meant for an address book that has none.
    expect(body).toContain(AUTHORED);
    expect(body).toContain(LINKED);
    expect(body).toContain(TOMBSTONED);

    // Provenance is still enforced. Importing an AI-inferred stub into a phone
    // is the outcome the authored scope exists to prevent, and it must not
    // become reachable just because the provider filter was left off.
    expect(body).not.toContain(MENTIONED);
    expect(body).not.toContain(IMPORTED);
  });
});
