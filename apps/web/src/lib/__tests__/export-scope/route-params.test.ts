import { beforeAll, describe, expect, it, vi } from "vitest";
import { GET as exportRoute } from "@/app/api/export/[format]/route";
import { AUTHORED, LINKED, MENTIONED, seedScopeFixtures } from "./helpers";

// The route gates on the session; the repo layer under test is tenant-agnostic
// (RLS scoping is EE's job), so a fixed user id suffices.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
  requireUserIdForPage: async () => "test-user",
  requireUserIdFromRequest: async () => "test-user",
}));

function get(format: string, query: string): Promise<Response> {
  return exportRoute(new Request(`http://localhost/api/export/${format}${query}`), {
    params: Promise.resolve({ format }),
  });
}

beforeAll(seedScopeFixtures);

/**
 * A silently ignored filter here is the whole failure mode: the user believes
 * they downloaded a safe seed and imports AI-inferred stubs into a file that
 * syncs to their laptop, car and watch. Every unusable parameter is a 400.
 */
describe("GET /api/export/[format] parameter validation", () => {
  it("rejects an unknown scope rather than falling back to everything", async () => {
    expect((await get("vcard", "?scope=authoredd")).status).toBe(400);
  });

  it("rejects an unknown provider", async () => {
    expect((await get("vcard", "?scope=authored&provider=nokia")).status).toBe(400);
  });

  it("rejects a provider without scope=authored, which would silently narrow the full export", async () => {
    expect((await get("vcard", "?provider=device")).status).toBe(400);
  });

  it("rejects scope on the json dump, which cannot honour it", async () => {
    expect((await get("json", "?scope=authored")).status).toBe(400);
  });

  it("serves an unfiltered vcard by default and a filtered one under scope=authored", async () => {
    const full = await get("vcard", "");
    expect(full.status).toBe(200);
    expect(await full.text()).toContain(MENTIONED);

    const seed = await get("vcard", "?scope=authored&provider=device");
    expect(seed.status).toBe(200);
    const body = await seed.text();
    expect(body).toContain(AUTHORED);
    expect(body).not.toContain(MENTIONED);
    expect(body).not.toContain(LINKED);
  });
});
