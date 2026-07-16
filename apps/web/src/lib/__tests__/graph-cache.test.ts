import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, graphLayouts } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { createEvent, renameEvent } from "@/lib/repo/events";
import { fetchGraphVersion } from "@/lib/repo/graph-data";
import { getLayout, upsertLayout } from "@/lib/repo/graph-layouts";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
} from "@/lib/repo/relationships";
import { GET as getFullGraph } from "@/app/api/graph/full/route";
import { POST as postLayout } from "@/app/api/graph/layout/route";

// Route handlers gate on the session; the repo layer under test is
// tenant-agnostic (RLS scoping is EE's job), so a fixed user id suffices.
vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "test-user",
  requireUserIdForPage: async () => "test-user",
  requireUserIdFromRequest: async () => "test-user",
}));

/**
 * The graph version is the ETag for GET /api/graph/full: any change that
 * alters what the client would RENDER must change it — otherwise a 304
 * would pin a stale IndexedDB payload forever. Renames matter as much as
 * inserts: companies/events have no updated_at, so the version folds an
 * md5 over their mutable name columns rather than trusting timestamps.
 */
describe("fetchGraphVersion tracks every payload-visible change", () => {
  it("is stable when nothing changes, and moves when a contact is added", async () => {
    const before = await fetchGraphVersion();
    expect(await fetchGraphVersion()).toBe(before);

    await createContact({ ...emptyExtractedContact(), name: "Vera Version" }, "manual");
    expect(await fetchGraphVersion()).not.toBe(before);
  });

  it("changes on a company rename — no timestamp column can mask it", async () => {
    const db = await getDb();
    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Casey Companyrename", company: "Before Corp" },
      "manual",
    );
    const [{ companyId }] = await db
      .select({ companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.id, contactId));
    const before = await fetchGraphVersion();

    await db.update(companies).set({ name: "After Corp" }).where(eq(companies.id, companyId ?? ""));
    expect(await fetchGraphVersion()).not.toBe(before);
  });

  it("changes on an event rename (events carry only created_at)", async () => {
    const eventId = await createEvent("Version Summit");
    const before = await fetchGraphVersion();

    await renameEvent(eventId, "Version Summit — Renamed");
    expect(await fetchGraphVersion()).not.toBe(before);
  });

  it("changes when an edge is tombstoned — a deleted thread must not 304", async () => {
    const anil = await createContact({ ...emptyExtractedContact(), name: "Anil Versionedge" }, "manual");
    const bela = await createContact({ ...emptyExtractedContact(), name: "Bela Versionedge" }, "manual");
    const edgeId = await createRelationshipEdge({
      srcId: anil,
      srcKind: "contact",
      dstId: bela,
      dstKind: "contact",
      predicate: "friend_of",
    });
    const before = await fetchGraphVersion();

    await deleteRelationshipEdge(edgeId);
    expect(await fetchGraphVersion()).not.toBe(before);
  });
});

/**
 * One layout row per user, replaced in place: the upsert targets the
 * graph_layouts_scope_key constraint BY NAME so the same code works when EE
 * upgrades it to (user_id, key) — see the settings_pkey note in CLAUDE.md.
 */
describe("graph-layouts repo round-trips a single per-user row", () => {
  it("returns null before any layout is saved", async () => {
    expect(await getLayout()).toBeNull();
  });

  it("upserts, then replaces in place — never a second row", async () => {
    await upsertLayout("hash-1", { a: [1, 2] });
    expect(await getLayout()).toEqual({ hash: "hash-1", positions: { a: [1, 2] } });

    await upsertLayout("hash-2", { a: [3.5, -4], b: [5, 6] });
    expect(await getLayout()).toEqual({ hash: "hash-2", positions: { a: [3.5, -4], b: [5, 6] } });

    const db = await getDb();
    expect(await db.select({ id: graphLayouts.id }).from(graphLayouts)).toHaveLength(1);
  });
});

/**
 * The wire contract the client's stale-while-revalidate boot depends on:
 * 200 + ETag on first load, 304 (empty body) while unchanged, fresh 200
 * after any write, and the saved layout riding along in the payload.
 */
describe("GET /api/graph/full revalidation", () => {
  it("serves 304 for a matching If-None-Match and re-serves 200 after a write", async () => {
    const first = await getFullGraph(new Request("http://test/api/graph/full"));
    expect(first.status).toBe(200);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const payload = await first.json();
    // The layout saved above arrives with the payload (same Promise.all).
    expect(payload.layout).toEqual({ hash: "hash-2", positions: { a: [3.5, -4], b: [5, 6] } });

    const revalidated = await getFullGraph(
      new Request("http://test/api/graph/full", { headers: { "if-none-match": etag ?? "" } }),
    );
    expect(revalidated.status).toBe(304);
    expect(await revalidated.text()).toBe("");

    await createContact({ ...emptyExtractedContact(), name: "Etag Invalidator" }, "manual");
    const after = await getFullGraph(
      new Request("http://test/api/graph/full", { headers: { "if-none-match": etag ?? "" } }),
    );
    expect(after.status).toBe(200);
    expect(after.headers.get("etag")).not.toBe(etag);
  });
});

describe("POST /api/graph/layout", () => {
  const url = "http://test/api/graph/layout";

  it("persists a valid body", async () => {
    const res = await postLayout(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hash: "posted", positions: { n1: [1, 2], n2: [-3, 4.25] } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await getLayout()).toEqual({ hash: "posted", positions: { n1: [1, 2], n2: [-3, 4.25] } });
  });

  it("rejects malformed positions with 400", async () => {
    for (const positions of [{ n1: [1] }, { n1: [1, "2"] }, { n1: [1, Number.NaN] }, "nope"]) {
      const res = await postLayout(
        new Request(url, { method: "POST", body: JSON.stringify({ hash: "bad", positions }) }),
      );
      expect(res.status).toBe(400);
    }
    expect((await getLayout())?.hash).toBe("posted"); // nothing overwrote the good row
  });

  it("rejects oversized bodies with 413 before parsing", async () => {
    const res = await postLayout(
      new Request(url, { method: "POST", body: `{"pad":"${"x".repeat(8_000_001)}"}` }),
    );
    expect(res.status).toBe(413);
  });
});
