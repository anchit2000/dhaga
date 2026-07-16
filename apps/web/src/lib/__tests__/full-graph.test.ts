import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import { createEntity } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { fetchFullGraph, fetchTagLayer } from "@/lib/repo/graph-data";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
} from "@/lib/repo/relationships";

/**
 * /api/graph/full is the default payload the graph client renders from —
 * every node kind must arrive, and the synthesized edge ids are pinned by the
 * design contract (the client uses them as stable sigma keys across reloads).
 * Tag hubs/tagged edges are the one unbounded pair-multiplier (contacts ×
 * tags), so they ship separately via fetchTagLayer (/api/graph/tags).
 */
describe("fetchFullGraph assembles every node kind and synthesizes edges", () => {
  it("returns contact/company/event/entity nodes and the pinned edge id formats", async () => {
    const db = await getDb();
    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Nia Fullgraph", company: "FullGraph Corp" },
      "manual",
    );
    await db.update(contacts).set({ tags: ["AI Research"] }).where(eq(contacts.id, contactId));
    const eventId = await createEvent("KG Summit");
    await addContactToEvent(eventId, contactId);
    const typeId = await createNodeType({ name: "Gym", color: "#7c9ce8" });
    const entityId = await createEntity({ typeId, name: "Iron Temple" });
    const edgeId = await createRelationshipEdge({
      srcId: contactId,
      srcKind: "contact",
      dstId: entityId,
      dstKind: "entity",
      predicate: "member_of",
    });

    const graph = await fetchFullGraph();
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(byId.get(contactId)?.kind).toBe("contact");
    const [{ companyId }] = await db
      .select({ companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.id, contactId));
    expect(byId.get(companyId ?? "")?.kind).toBe("company");
    expect(byId.get(eventId)?.kind).toBe("event");
    // Entity nodes carry their node type: typeId for coloring, name as sublabel.
    expect(byId.get(entityId)).toMatchObject({ kind: "entity", typeId, sublabel: "Gym" });
    // Tags are OUT of the default payload — the tagged contact above must not
    // produce a hub or membership edge here (they load lazily, tested below).
    expect(graph.nodes.some((node) => node.kind === "tag")).toBe(false);
    expect(graph.edges.some((edge) => edge.kind === "tagged")).toBe(false);

    const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
    expect(edgeById.get(edgeId)).toMatchObject({
      source: contactId,
      target: entityId,
      predicate: "member_of",
      kind: "explicit",
    });
    expect(edgeById.get(`works-at:${contactId}`)).toMatchObject({
      source: contactId,
      target: companyId,
      kind: "works_at",
    });
    expect(edgeById.get(`attended:${eventId}:${contactId}`)).toMatchObject({
      source: contactId,
      target: eventId,
      kind: "attended",
    });

    // The registries ride along so the client can color entities and label
    // custom predicates without extra round-trips.
    expect(graph.nodeTypes).toContainEqual({ id: typeId, name: "Gym", slug: "gym", color: "#7c9ce8" });
  });

  it("excludes tombstoned edges — a deleted relationship must not redraw", async () => {
    const anil = await createContact({ ...emptyExtractedContact(), name: "Anil Tombstone" }, "manual");
    const bela = await createContact({ ...emptyExtractedContact(), name: "Bela Tombstone" }, "manual");
    const edgeId = await createRelationshipEdge({
      srcId: anil,
      srcKind: "contact",
      dstId: bela,
      dstKind: "contact",
      predicate: "friend_of",
    });
    expect((await fetchFullGraph()).edges.some((edge) => edge.id === edgeId)).toBe(true);

    await deleteRelationshipEdge(edgeId);
    expect((await fetchFullGraph()).edges.some((edge) => edge.id === edgeId)).toBe(false);
  });
});

/**
 * The lazy tag layer keeps the id formats the client pinned when tags lived
 * in the full payload — merged hubs/edges must be the same stable sigma keys.
 */
describe("fetchTagLayer synthesizes the tag layer on demand", () => {
  it("returns hubs and membership edges with the pinned id formats, sharing hubs across spellings", async () => {
    const db = await getDb();
    const tara = await createContact({ ...emptyExtractedContact(), name: "Tara Taglayer" }, "manual");
    const tomas = await createContact({ ...emptyExtractedContact(), name: "Tomas Taglayer" }, "manual");
    await db.update(contacts).set({ tags: ["Deep Tech"] }).where(eq(contacts.id, tara));
    // "deep-tech" slugifies identically — one hub, byte-order-min spelling
    // names it (deterministic across PGlite and hosted Postgres collations),
    // and memberCount counts both contacts.
    await db.update(contacts).set({ tags: ["deep-tech"] }).where(eq(contacts.id, tomas));

    const layer = await fetchTagLayer();
    expect(layer.hubs.filter((hub) => hub.slug === "deep_tech")).toEqual([
      { id: "tag:deep_tech", label: "Deep Tech", slug: "deep_tech", memberCount: 2 },
    ]);
    expect(layer.truncated).toBe(false); // a handful of pairs fits the budget
    expect(layer.edges).toContainEqual({
      id: `tagged:deep_tech:${tara}`,
      source: tara,
      target: "tag:deep_tech",
    });
    expect(layer.edges).toContainEqual({
      id: `tagged:deep_tech:${tomas}`,
      source: tomas,
      target: "tag:deep_tech",
    });
  });
});
