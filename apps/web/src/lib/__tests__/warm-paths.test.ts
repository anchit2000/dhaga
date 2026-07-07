import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { findWarmPaths } from "@/lib/repo/warm-paths";

function person(name: string, company: string | null = null) {
  return {
    name,
    title: null,
    company,
    emails: [],
    phones: [],
    links: [],
    location: null,
  };
}

/** Insert a raw graph edge, bypassing applyExtraction's name-lookup plumbing
 * so tests can wire up arbitrary contact/company graphs directly. */
async function addEdge(
  srcId: string,
  predicate: string,
  dstId: string,
  dstType: "contact" | "company" = "contact",
): Promise<void> {
  const db = await getDb();
  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId,
    predicate,
    dstType: dstType === "company" ? "company" : "person",
    dstId,
  });
}

/**
 * Warm-path finding has no prior test coverage at all despite being a pure,
 * zero-AI-cost algorithm — this file closes that gap and pins down the BFS
 * behavior the code comments claim (shortest paths, no revisits, distinct
 * entries) so a future edit can't silently break it.
 */
describe("findWarmPaths", () => {
  it("returns nothing for a target with no connections", async () => {
    const targetId = await createContact(person("Isolated Ivy"), "manual");
    const paths = await findWarmPaths(targetId);
    expect(paths).toEqual([]);
  });

  it("returns nothing for an unknown target id", async () => {
    const paths = await findWarmPaths(randomUUID());
    expect(paths).toEqual([]);
  });

  it("finds a colleague path through a shared current employer", async () => {
    const entryId = await createContact(person("Amit Colleague", "Acme"), "manual");
    const targetId = await createContact(person("Zara Target", "Acme"), "manual");

    const paths = await findWarmPaths(targetId);
    expect(paths).toHaveLength(1);
    const ids = paths[0].nodes.map((node) => node.id);
    expect(ids[0]).toBe(entryId); // entry contact first
    expect(ids[ids.length - 1]).toBe(targetId); // target last
  });

  it("ignores a self-referential edge instead of looping or crashing", async () => {
    const targetId = await createContact(person("Sam Self"), "manual");
    await addEdge(targetId, "knows", targetId); // malformed self-loop
    const entryId = await createContact(person("Real Entry"), "manual");
    await addEdge(entryId, "knows", targetId);

    const paths = await findWarmPaths(targetId);
    expect(paths).toHaveLength(1);
    expect(paths[0].nodes.map((node) => node.id)).toEqual([entryId, targetId]);
  });

  it("a duplicated edge doesn't produce a duplicate path", async () => {
    const entryId = await createContact(person("Dupe Entry"), "manual");
    const targetId = await createContact(person("Dupe Target"), "manual");
    await addEdge(entryId, "knows", targetId);
    await addEdge(entryId, "knows", targetId); // same relationship, re-extracted

    const paths = await findWarmPaths(targetId);
    expect(paths).toHaveLength(1);
  });

  it("terminates and still finds the direct entry when the graph has a cycle", async () => {
    const a = await createContact(person("Cycle A"), "manual");
    const b = await createContact(person("Cycle B"), "manual");
    const c = await createContact(person("Cycle C"), "manual");
    // A-B-C-A cycle among people who all already know the target directly.
    await addEdge(a, "knows", b);
    await addEdge(b, "knows", c);
    await addEdge(c, "knows", a);
    const targetId = await createContact(person("Cycle Target"), "manual");
    await addEdge(a, "knows", targetId);
    await addEdge(b, "knows", targetId);
    await addEdge(c, "knows", targetId);

    const paths = await findWarmPaths(targetId);
    // Terminates (no infinite loop) and returns the three distinct direct
    // entries rather than getting stuck walking the A-B-C cycle.
    expect(paths).toHaveLength(3);
    const entries = paths.map((path) => path.nodes[0].id).sort();
    expect(entries).toEqual([a, b, c].sort());
  });

  it("prefers the shortest path: a direct entry beats a longer chain through it", async () => {
    const companyId = await findOrCreateCompany("Globex");
    const direct = await createContact(person("Direct Colleague", "Globex"), "manual");
    const targetId = await createContact(person("Globex Target", "Globex"), "manual");
    // A second contact who only reaches the target via the direct colleague,
    // not via the shared company — strictly a longer route.
    const distant = await createContact(person("Distant Friend"), "manual");
    await addEdge(distant, "knows", direct);
    void companyId;

    const paths = await findWarmPaths(targetId);
    const entries = paths.map((path) => path.nodes[0].id);
    expect(entries).toContain(direct);
    expect(entries).not.toContain(distant);
  });
});
