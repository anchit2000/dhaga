import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact, relationshipRole } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges } from "@/lib/db/schema";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { createEvent } from "@/lib/repo/events";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
  listContactRelationships,
  updateRelationshipEdge,
} from "@/lib/repo/relationships";

function personRelationship(objectName: string): NoteExtraction {
  return {
    facts: [],
    relationships: [
      { subject: "contact", predicate: "parent_of", object: objectName, object_type: "person", object_is_named: true, entity_type_hint: null, role_title: null, is_current: null, started_at: null, ended_at: null },
    ],
    follow_ups: [],
    tags: [],
  };
}

describe("relationshipRole — direction-aware inverse labels", () => {
  it("inverts a known asymmetric predicate", () => {
    // The whole point of storing one edge: it must read correctly from each end.
    expect(relationshipRole("parent_of", true)).toBe("child");
    expect(relationshipRole("parent_of", false)).toBe("parent");
  });

  it("keeps symmetric relations identical both ways", () => {
    expect(relationshipRole("sibling_of", true)).toBe("sibling");
    expect(relationshipRole("sibling_of", false)).toBe("sibling");
  });

  it("humanizes an unknown predicate rather than inventing a wrong inverse", () => {
    expect(relationshipRole("collaborated_with", true)).toBe("collaborated with");
    expect(relationshipRole("collaborated_with", false)).toBe("collaborated with");
  });
});

describe("listContactRelationships reads one stored edge from both ends", () => {
  it("shows the child on the parent's page and the parent on the child's page", async () => {
    const ajay = await createContact(
      { ...emptyExtractedContact(), name: "Rohan Rel Test" },
      "manual",
    );
    const note = await addNote(ajay, "text", "Priya is my son");
    // parent_of edge: Rohan (source) --parent_of--> Priya (a new mentioned person)
    await applyExtraction(ajay, note, personRelationship("Priya Rel Test"));

    const fromRohan = await listContactRelationships(ajay);
    expect(fromRohan).toHaveLength(1);
    expect(fromRohan[0].name).toBe("Priya Rel Test");
    // WHY: the reported bug was the edge reading "parent of" on BOTH pages.
    // From Rohan (the parent/source), the other person must read as his child.
    expect(fromRohan[0].role).toBe("child");
    expect(fromRohan[0].mentioned).toBe(true);

    const fromPriya = await listContactRelationships(fromRohan[0].contactId);
    expect(fromPriya).toHaveLength(1);
    expect(fromPriya[0].name).toBe("Rohan Rel Test");
    // WHY: the SAME stored row must invert here — no second edge is written.
    expect(fromPriya[0].role).toBe("parent");
    expect(fromPriya[0].mentioned).toBe(false);
  });
});

describe("updateRelationshipEdge corrects an edge without recreating it", () => {
  it("re-labels and reverses the one stored row, keeping its id and receipt", async () => {
    const arjun = await createContact(
      { ...emptyExtractedContact(), name: "Arjun Edit Test" },
      "manual",
    );
    const note = await addNote(arjun, "text", "Meera is my son");
    // Stored as Arjun --parent_of--> Meera, with the note as its receipt.
    await applyExtraction(arjun, note, personRelationship("Meera Edit Test"));
    const [before] = await listContactRelationships(arjun);
    expect(before.role).toBe("child");
    expect(before.viewerIsSource).toBe(true);

    // The extraction had it backwards: Meera is the parent. Correcting the
    // direction rewrites the SAME row, not a delete plus a new edge.
    const wasPointingAt = await updateRelationshipEdge(before.edgeId, {
      srcId: before.contactId,
      srcKind: "contact",
      dstId: arjun,
      dstKind: "contact",
      predicate: "parent_of",
    });
    // WHY: the caller revalidates the pages this edge LEFT as well as the ones
    // it joins, so the pre-edit endpoints have to come back out.
    expect(wasPointingAt).toEqual({
      srcKind: "contact",
      srcId: arjun,
      dstKind: "contact",
      dstId: before.contactId,
    });

    const after = await listContactRelationships(arjun);
    // WHY: an edit that recreated the edge would issue a new id and orphan the
    // note receipt — the fix must not cost the user the edge's provenance.
    expect(after).toHaveLength(1);
    expect(after[0].edgeId).toBe(before.edgeId);
    expect(after[0].role).toBe("parent");
    expect(after[0].viewerIsSource).toBe(false);
    const db = await getDb();
    const [row] = await db
      .select({ sourceNoteId: edges.sourceNoteId })
      .from(edges)
      .where(eq(edges.id, before.edgeId));
    expect(row.sourceNoteId).toBe(note);

    // WHY: one row still has to read correctly from both ends after the edit.
    const fromMeera = await listContactRelationships(before.contactId);
    expect(fromMeera[0].role).toBe("child");
  });

  it("changes only the label when the direction is left alone", async () => {
    const dev = await createContact(
      { ...emptyExtractedContact(), name: "Dev Label Test" },
      "manual",
    );
    const lab = await createContact(
      { ...emptyExtractedContact(), name: "Lata Label Test" },
      "manual",
    );
    await createRelationshipEdge({
      srcId: dev,
      srcKind: "contact",
      dstId: lab,
      dstKind: "contact",
      predicate: "parent_of",
    });
    const [before] = await listContactRelationships(dev);
    await updateRelationshipEdge(before.edgeId, {
      srcId: dev,
      srcKind: "contact",
      dstId: lab,
      dstKind: "contact",
      predicate: "mentor_of",
    });
    const [after] = await listContactRelationships(dev);
    expect(after.predicate).toBe("mentor_of");
    expect(after.viewerIsSource).toBe(true);
  });

  it("repoints the edge at a different person, leaving the old one alone", async () => {
    const host = await createContact(
      { ...emptyExtractedContact(), name: "Nina Repoint Host" },
      "manual",
    );
    const wrong = await createContact(
      { ...emptyExtractedContact(), name: "Kabir Repoint Wrong" },
      "manual",
    );
    const right = await createContact(
      { ...emptyExtractedContact(), name: "Kabir Repoint Right" },
      "manual",
    );
    const edgeId = await createRelationshipEdge({
      srcId: host,
      srcKind: "contact",
      dstId: wrong,
      dstKind: "contact",
      predicate: "mentor_of",
    });

    // WHY (the reported case): two people share a name and the search picked
    // the wrong one. Correcting that must move the edge, not duplicate it.
    await updateRelationshipEdge(edgeId, {
      srcId: host,
      srcKind: "contact",
      dstId: right,
      dstKind: "contact",
      predicate: "mentor_of",
    });

    const fromHost = await listContactRelationships(host);
    expect(fromHost).toHaveLength(1);
    expect(fromHost[0].edgeId).toBe(edgeId);
    expect(fromHost[0].contactId).toBe(right);
    // WHY: the person it used to point at must be left with nothing — a stale
    // row on their page is exactly the bug the correction was fixing.
    expect(await listContactRelationships(wrong)).toHaveLength(0);
    expect(await listContactRelationships(right)).toHaveLength(1);
  });

  it("reports a deleted edge instead of silently succeeding", async () => {
    const gone = await createContact(
      { ...emptyExtractedContact(), name: "Gone Edge Source" },
      "manual",
    );
    const other = await createContact(
      { ...emptyExtractedContact(), name: "Gone Edge Target" },
      "manual",
    );
    const edgeId = await createRelationshipEdge({
      srcId: gone,
      srcKind: "contact",
      dstId: other,
      dstKind: "contact",
      predicate: "sibling_of",
    });
    await deleteRelationshipEdge(edgeId);
    // WHY: the dialog can outlive the row (deleted in another tab). Returning
    // null lets the action say so rather than report a save that never landed.
    expect(
      await updateRelationshipEdge(edgeId, {
        srcId: other,
        srcKind: "contact",
        dstId: gone,
        dstKind: "contact",
        predicate: "sibling_of",
      }),
    ).toBeNull();
  });
});

describe("listContactRelationships spans every endpoint kind", () => {
  it("suppresses only the works_at edge that mirrors the employment header", async () => {
    const kiran = await createContact(
      { ...emptyExtractedContact(), name: "Kiran Kindspan" },
      "manual",
    );
    const acme = await findOrCreateCompany("Acme Kindspan Consulting");
    const sideGig = await findOrCreateCompany("Kindspan Side Gig Labs");
    const summit = await createEvent("Kindspan Summit");
    // Acme is the header employer (contacts.company_id) — its works_at edge
    // duplicates what the page header already shows.
    const db = await getDb();
    await db.update(contacts).set({ companyId: acme }).where(eq(contacts.id, kiran));
    await createRelationshipEdge({ srcId: kiran, srcKind: "contact", dstId: acme, dstKind: "company", predicate: "consults_for" });
    await createRelationshipEdge({ srcId: kiran, srcKind: "contact", dstId: acme, dstKind: "company", predicate: "works_at" });
    await createRelationshipEdge({ srcId: kiran, srcKind: "contact", dstId: sideGig, dstKind: "company", predicate: "works_at" });
    await createRelationshipEdge({ srcId: summit, srcKind: "event", dstId: kiran, dstKind: "contact", predicate: "organized_by" });

    const rels = await listContactRelationships(kiran);
    // WHY: the contact page's add-relationship dialog offers company and event
    // targets — an edge created there must not silently vanish from the same
    // page's Relationships list.
    expect(rels.map((rel) => [rel.kind, rel.name])).toContainEqual([
      "company",
      "Acme Kindspan Consulting",
    ]);
    expect(rels.map((rel) => [rel.kind, rel.name])).toContainEqual([
      "event",
      "Kindspan Summit",
    ]);
    // WHY (found live): a manual works_at to a company that is NOT the header
    // employer has no header mirroring it — hiding it made the dialog's own
    // output invisible and undeletable on the very page that created it.
    expect(rels.map((rel) => [rel.predicate, rel.name])).toContainEqual([
      "works_at",
      "Kindspan Side Gig Labs",
    ]);
    // WHY: the header employer's works_at IS the duplicate — the one company
    // edge the list must not repeat.
    expect(
      rels.some((rel) => rel.predicate === "works_at" && rel.name === "Acme Kindspan Consulting"),
    ).toBe(false);
    expect(rels).toHaveLength(3);
  });
});
