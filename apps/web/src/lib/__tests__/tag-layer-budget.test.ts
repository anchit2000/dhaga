import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { fetchTagLayer, fetchTagSpokes } from "@/lib/repo/graph-data";

/**
 * The tag layer is the graph's one unbounded pair-multiplier (measured: 873k
 * pairs → 3-8s reducer sweeps, ~100MB payloads) AND, with per-contact-unique
 * tags, an unbounded hub-multiplier (measured: 940k hubs / 117MB / 38.6s
 * merge). These tests pin the guard rails: singleton hubs never ship, hubs
 * are capped largest-first with a deterministic tiebreak, spokes ship inline
 * only while the SURVIVING hubs' pairs fit the edge budget, and the per-tag
 * endpoint is capped with a true memberCount. Budget/caps are injected
 * (test-only parameters) so the thresholds are exercised without seeding 60k
 * rows.
 */
describe("tag layer hub bounds + edge budget + per-tag spoke cap", () => {
  let ana = "";
  let bo = "";
  let cy = "";

  // Memberships: robotics {ana, bo, cy}, aero {ana, bo}, fintech {ana, bo} →
  // 7 surviving pairs. cy's duplicate spelling must NOT create an eighth pair
  // (per-contact dedupe), and cy's one-member tag must not ship at all.
  beforeAll(async () => {
    const db = await getDb();
    ana = await createContact({ ...emptyExtractedContact(), name: "Ana Budget" }, "manual");
    bo = await createContact({ ...emptyExtractedContact(), name: "Bo Budget" }, "manual");
    cy = await createContact({ ...emptyExtractedContact(), name: "Cy Budget" }, "manual");
    await db
      .update(contacts)
      .set({ tags: ["Robotics", "Fintech", "Aero"] })
      .where(eq(contacts.id, ana));
    await db
      .update(contacts)
      .set({ tags: ["Robotics", "Fintech", "Aero"] })
      .where(eq(contacts.id, bo));
    await db
      .update(contacts)
      .set({ tags: ["Robotics", "robotics!", "One-Off Interest"] })
      .where(eq(contacts.id, cy));
  });

  it("under budget: spokes ship inline, singleton hubs and their pairs never ship", async () => {
    const layer = await fetchTagLayer(7);
    expect(layer.truncated).toBe(false);
    expect(layer.hubsTruncated).toBe(false);
    expect(layer.totalHubs).toBe(3); // one_off_interest is floored out
    expect(layer.totalPairs).toBe(7); // cy's singleton pair doesn't count
    expect(layer.edges).toHaveLength(7);
    expect(layer.edges.some((edge) => edge.target === "tag:one_off_interest")).toBe(false);
    // memberCount DESC, slug ASC tiebreak (aero before fintech) — the same
    // deterministic order the cap cuts on.
    expect(layer.hubs.map((hub) => [hub.slug, hub.memberCount])).toEqual([
      ["robotics", 3],
      ["aero", 2],
      ["fintech", 2],
    ]);
  });

  it("over budget: hubs only (aggregate-bounded) + truncated flag — the pairs never leave the DB", async () => {
    const layer = await fetchTagLayer(6);
    expect(layer.truncated).toBe(true);
    expect(layer.totalPairs).toBe(7);
    expect(layer.edges).toEqual([]);
    // memberCount still arrives so the client can size hubs without spokes.
    expect(layer.hubs.find((hub) => hub.slug === "robotics")?.memberCount).toBe(3);
  });

  it("hub cap keeps the largest hubs (slug ASC on ties) and reports the cut", async () => {
    const layer = await fetchTagLayer(7, 2);
    expect(layer.hubs.map((hub) => hub.slug)).toEqual(["robotics", "aero"]);
    expect(layer.hubsTruncated).toBe(true);
    expect(layer.totalHubs).toBe(3);
    // Spokes for capped-out fintech must not ship — its hub isn't there.
    expect(layer.edges.some((edge) => edge.target === "tag:fintech")).toBe(false);
    expect(layer.edges).toHaveLength(5);
  });

  it("the budget decision counts pairs over SURVIVING hubs only", async () => {
    // 7 total eligible pairs, but the cap leaves robotics+aero = 5 — a budget
    // of 5 must ship spokes inline instead of truncating on the phantom 7.
    const layer = await fetchTagLayer(5, 2);
    expect(layer.totalPairs).toBe(5);
    expect(layer.truncated).toBe(false);
    expect(layer.edges).toHaveLength(5);
  });

  it("?tag= caps spokes in deterministic contact-id order and keeps the TRUE memberCount", async () => {
    const spokes = await fetchTagSpokes("Robotics", 2);
    expect(spokes.hub).toEqual({
      id: "tag:robotics",
      label: "Robotics", // byte-order min of {"Robotics", "robotics!"}
      slug: "robotics",
      memberCount: 3, // the cap bit — the client shows "+1 more not shown"
    });
    const firstTwoMembers = [ana, bo, cy].sort().slice(0, 2);
    expect(spokes.edges.map((edge) => edge.source)).toEqual(firstTwoMembers);
    expect(spokes.edges.map((edge) => edge.id)).toEqual(
      firstTwoMembers.map((id) => `tagged:robotics:${id}`),
    );
  });

  it("an unknown tag returns an empty, zero-member payload rather than an error", async () => {
    const spokes = await fetchTagSpokes("never-used-tag");
    expect(spokes.hub.memberCount).toBe(0);
    expect(spokes.edges).toEqual([]);
  });
});
