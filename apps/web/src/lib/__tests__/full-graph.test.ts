import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyContactProfile, emptyExtractedContact } from "@dhaga/core";
import type { ContactProfile, Position } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact, createContactProfile, findOrCreateCompany } from "@/lib/repo/contacts";
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
 * Affiliation edges now derive from the positions table (source of truth for
 * employment & education), not just the denormalised company_id — so past and
 * additional roles surface in the graph. The contract these pin: the PRIMARY
 * role keeps exactly one kind:"works_at" edge with the pinned `works-at:<id>`
 * sigma key (FA2 seeding + the client's stable-key assumption depend on it),
 * every other role ships as a labeled kind:"affiliation" edge, and the edge
 * label always comes from affiliationPredicate() (studied_at wins; a plain past
 * role reads worked_at, not works_at).
 */
describe("fetchFullGraph derives affiliation edges from positions", () => {
  function affilProfile(name: string, roles: Position[]): ContactProfile {
    return { ...emptyContactProfile(), name, positions: roles };
  }

  it("keeps exactly one pinned works-at edge for a plain primary role (backward compat)", async () => {
    const tag = randomUUID();
    const co = `Affil Solo ${tag}`;
    const id = await createContactProfile(
      affilProfile(`Affil Solo Person ${tag}`, [
        { title: "Engineer", company: co, department: null, current: true, startedAt: null, endedAt: null, note: null, relation: null },
      ]),
      "manual",
    );
    const companyId = await findOrCreateCompany(co); // idempotent → the id the profile created

    const outgoing = (await fetchFullGraph()).edges.filter((edge) => edge.source === id);
    // WHY: the client uses `works-at:<contactId>` as a STABLE sigma key across
    // reloads and seeds FA2 clustering off kind:"works_at". A plain current
    // primary role must still yield exactly that one edge — deriving edges from
    // positions must not alter the backward-compatible shape the old company_id
    // edge had.
    expect(outgoing).toEqual([
      { id: `works-at:${id}`, source: id, target: companyId, predicate: "works_at", kind: "works_at" },
    ]);
  });

  it("adds a labeled kind:'affiliation' worked_at edge for a PAST secondary role", async () => {
    const tag = randomUUID();
    const currentCo = `Affil Current ${tag}`;
    const pastCo = `Affil Past ${tag}`;
    const id = await createContactProfile(
      affilProfile(`Affil History Person ${tag}`, [
        { title: "Now", company: currentCo, department: null, current: true, startedAt: null, endedAt: null, note: null, relation: null },
        { title: "Then", company: pastCo, department: null, current: false, startedAt: null, endedAt: "2020", note: null, relation: null },
      ]),
      "manual",
    );
    const currentId = await findOrCreateCompany(currentCo);
    const pastId = await findOrCreateCompany(pastCo);

    const outgoing = (await fetchFullGraph()).edges.filter((edge) => edge.source === id);
    // The primary (current) role still holds the pinned works-at edge …
    expect(outgoing).toContainEqual(
      expect.objectContaining({ id: `works-at:${id}`, target: currentId, kind: "works_at" }),
    );
    // WHY: past employment is exactly what the company_id-only edge dropped; it
    // must surface as a SEPARATE labeled affiliation reading "worked at" — never
    // a second works_at (which would collide on the pinned key and mis-cluster).
    const pastEdge = outgoing.find((edge) => edge.target === pastId);
    expect(pastEdge).toMatchObject({ predicate: "worked_at", kind: "affiliation" });
    expect(pastEdge?.id).not.toBe(`works-at:${id}`);
  });

  it("labels a studied_at role by its relation — works_at kind when primary, affiliation when not", async () => {
    const tag = randomUUID();
    // studied_at as the PRIMARY role.
    const school = `Affil School ${tag}`;
    const student = await createContactProfile(
      affilProfile(`Affil Student ${tag}`, [
        { title: null, company: school, department: null, current: true, startedAt: null, endedAt: null, note: null, relation: "studied_at" },
      ]),
      "manual",
    );
    const schoolId = await findOrCreateCompany(school);

    // studied_at as a SECONDARY role, alongside a primary job.
    const jobCo = `Affil Job ${tag}`;
    const almaMater = `Affil Alma ${tag}`;
    const grad = await createContactProfile(
      affilProfile(`Affil Grad ${tag}`, [
        { title: "PM", company: jobCo, department: null, current: true, startedAt: null, endedAt: null, note: null, relation: null },
        { title: null, company: almaMater, department: null, current: false, startedAt: null, endedAt: null, note: null, relation: "studied_at" },
      ]),
      "manual",
    );
    const almaId = await findOrCreateCompany(almaMater);

    const graph = await fetchFullGraph();

    // WHY: the label must follow the relation (studied_at), but because this is
    // the PRIMARY role the client still needs kind:"works_at" + the pinned key to
    // seed clustering — the override changes the label, not the clustering role.
    const studentEdge = graph.edges.find((edge) => edge.id === `works-at:${student}`);
    expect(studentEdge).toMatchObject({ target: schoolId, predicate: "studied_at", kind: "works_at" });

    // WHY: a NON-primary studied_at is a genuine education affiliation — it must
    // ship as kind:"affiliation" labeled studied_at, distinct from the job edge.
    const almaEdge = graph.edges.find((edge) => edge.source === grad && edge.target === almaId);
    expect(almaEdge).toMatchObject({ predicate: "studied_at", kind: "affiliation" });
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
