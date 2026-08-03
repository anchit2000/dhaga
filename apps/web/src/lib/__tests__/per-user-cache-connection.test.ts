import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rule 9 tripwire: ONE REQUEST, AT MOST ONE TENANT CONNECTION.
 *
 * The tenant pool caps at 3 per instance (packages/ee). `cachePerUser` used to
 * be `unstable_cache(() => withUserDb(userId, read))`, so on a COLD cache the
 * read checked out a second connection while the request was already holding
 * one — a single /app render needing 2 of the 3 slots, and three concurrent
 * cold requests able to wait out the whole acquire timeout (the shape behind
 * PRs #83/#96). This spec counts real checkouts against a fake tenant gate and
 * fails if a second one appears.
 *
 * The second spec is the more important one: reuse is only safe because the
 * connection is proven to belong to the SAME tenant. A cache entry is keyed and
 * tagged by userId, so lending it a connection scoped to someone else would
 * write another user's rows under that key — staleness is a bug, a broken scope
 * is a leak. That case must still open its own connection.
 */

const h = vi.hoisted(() => ({
  state: { open: 0, maxOpen: 0, checkouts: [] as string[] },
}));

vi.mock("@/lib/hosted/gate", () => ({
  getTenantGate: async () => ({
    scopedDb: async (userId: string) => {
      h.state.checkouts.push(userId);
      h.state.open += 1;
      h.state.maxOpen = Math.max(h.state.maxOpen, h.state.open);
      const db = { tenant: userId };
      return {
        run: async (fn: (scoped: unknown) => Promise<unknown>) => fn(db),
        begin: async () => db,
        release: () => {
          h.state.open -= 1;
        },
      };
    },
  }),
}));

// No session: the request-scope lookup must fall back on its own, not throw.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "u1",
  requireUserIdForPage: async () => "u1",
  requireUserIdFromRequest: async () => "u1",
}));

const { cachePerUser } = await import("@/lib/cache/per-user");
const { getDb, withUserDb } = await import("@/lib/db/request-scope");

beforeEach(() => {
  h.state = { open: 0, maxOpen: 0, checkouts: [] };
});

describe("a per-user cached read never opens a second tenant connection", () => {
  it("runs a cache miss on the connection the request already holds", async () => {
    const seen: unknown[] = [];
    await withUserDb("u1", async () => {
      await cachePerUser(`reuse-${Date.now()}`, "u1", async () => {
        seen.push(await getDb());
        return { ok: true };
      });
    });

    expect(
      h.state.checkouts,
      "the cached read checked a SECOND connection out of the max-3 tenant pool while the request already held one",
    ).toEqual(["u1"]);
    expect(h.state.maxOpen).toBe(1);
    expect(seen).toEqual([{ tenant: "u1" }]);
  });

  it("refuses to reuse a connection scoped to a different tenant", async () => {
    const seen: unknown[] = [];
    await withUserDb("u1", async () => {
      await cachePerUser(`isolation-${Date.now()}`, "u2", async () => {
        seen.push(await getDb());
        return { ok: true };
      });
    });

    // Two checkouts is the CORRECT answer here: what lands under u2's cache key
    // must have been read as u2.
    expect(h.state.checkouts).toEqual(["u1", "u2"]);
    expect(
      seen,
      "a u2-keyed cache entry was filled from u1's connection — that is a cross-tenant leak, not a saved checkout",
    ).toEqual([{ tenant: "u2" }]);
  });

  it("still scopes itself when the request holds nothing (a job or a script)", async () => {
    const seen: unknown[] = [];
    await cachePerUser(`unscoped-${Date.now()}`, "u3", async () => {
      seen.push(await getDb());
      return { ok: true };
    });

    expect(h.state.checkouts).toEqual(["u3"]);
    expect(h.state.maxOpen).toBe(1);
    expect(seen).toEqual([{ tenant: "u3" }]);
  });
});
