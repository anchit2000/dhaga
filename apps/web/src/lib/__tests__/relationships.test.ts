import { describe, expect, it } from "vitest";
import { emptyExtractedContact, relationshipRole } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { createEvent } from "@/lib/repo/events";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import {
  createRelationshipEdge,
  listContactRelationships,
} from "@/lib/repo/relationships";

function personRelationship(objectName: string): NoteExtraction {
  return {
    facts: [],
    relationships: [
      { subject: "contact", predicate: "parent_of", object: objectName, object_type: "person", entity_type_hint: null },
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
      { ...emptyExtractedContact(), name: "Ajay Rel Test" },
      "manual",
    );
    const note = await addNote(ajay, "text", "Anchit is my son");
    // parent_of edge: Ajay (source) --parent_of--> Anchit (a new mentioned person)
    await applyExtraction(ajay, note, personRelationship("Anchit Rel Test"));

    const fromAjay = await listContactRelationships(ajay);
    expect(fromAjay).toHaveLength(1);
    expect(fromAjay[0].name).toBe("Anchit Rel Test");
    // WHY: the reported bug was the edge reading "parent of" on BOTH pages.
    // From Ajay (the parent/source), the other person must read as his child.
    expect(fromAjay[0].role).toBe("child");
    expect(fromAjay[0].mentioned).toBe(true);

    const fromAnchit = await listContactRelationships(fromAjay[0].contactId);
    expect(fromAnchit).toHaveLength(1);
    expect(fromAnchit[0].name).toBe("Ajay Rel Test");
    // WHY: the SAME stored row must invert here — no second edge is written.
    expect(fromAnchit[0].role).toBe("parent");
    expect(fromAnchit[0].mentioned).toBe(false);
  });
});

describe("listContactRelationships spans every endpoint kind", () => {
  it("keeps company and event edges visible but suppresses works_at duplicates", async () => {
    const kiran = await createContact(
      { ...emptyExtractedContact(), name: "Kiran Kindspan" },
      "manual",
    );
    const acme = await findOrCreateCompany("Acme Kindspan Consulting");
    const summit = await createEvent("Kindspan Summit");
    await createRelationshipEdge({ srcId: kiran, srcKind: "contact", dstId: acme, dstKind: "company", predicate: "consults_for" });
    await createRelationshipEdge({ srcId: kiran, srcKind: "contact", dstId: acme, dstKind: "company", predicate: "works_at" });
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
    // WHY: works_at → company duplicates the employment header sourced from
    // company_id — the one company edge the list must NOT repeat.
    expect(rels.some((rel) => rel.kind === "company" && rel.predicate === "works_at")).toBe(false);
    expect(rels).toHaveLength(2);
  });
});
