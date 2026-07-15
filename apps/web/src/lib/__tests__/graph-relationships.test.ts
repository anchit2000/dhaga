import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { fetchContactRelationshipGraph } from "@/lib/repo/graph-data";

// Distinct first names per case: the resolver treats a fuzzy (same-first-name)
// match as ambiguous and defers it to a suggestion, so reusing names across
// tests in the same in-memory DB would suppress the auto-linked edge.
function parentRelationship(objectName: string): NoteExtraction {
  return {
    facts: [],
    relationships: [
      { subject: "contact", predicate: "parent_of", object: objectName, object_type: "person" },
    ],
    follow_ups: [],
    tags: [],
  };
}

async function makeContact(name: string): Promise<string> {
  return createContact({ ...emptyExtractedContact(), name }, "manual");
}

describe("fetchContactRelationshipGraph", () => {
  it("returns the neighbour node and the directed, labelled edge", async () => {
    const devan = await makeContact("Devan Outedge");
    const note = await addNote(devan, "text", "Esha is my child");
    await applyExtraction(devan, note, parentRelationship("Esha Outedge"));

    const graph = await fetchContactRelationshipGraph(devan);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].label).toBe("Esha Outedge");
    expect(graph.edges).toHaveLength(1);
    // WHY: the graph must draw Devan --parent of--> Esha across clusters, so
    // the edge keeps the stored direction and a readable label.
    expect(graph.edges[0].source).toBe(devan);
    expect(graph.edges[0].target).toBe(graph.nodes[0].id);
    expect(graph.edges[0].label).toBe("parent of");
  });

  it("surfaces the same edge from the neighbour's side too (in-edge)", async () => {
    const farid = await makeContact("Farid Inedge");
    const note = await addNote(farid, "text", "Gauri is my child");
    await applyExtraction(farid, note, parentRelationship("Gauri Inedge"));
    const gauriId = (await fetchContactRelationshipGraph(farid)).nodes[0].id;

    const fromGauri = await fetchContactRelationshipGraph(gauriId);
    expect(fromGauri.nodes.map((node) => node.label)).toContain("Farid Inedge");
    expect(fromGauri.edges).toHaveLength(1);
    // The stored direction is unchanged; only the display side differs.
    expect(fromGauri.edges[0].source).toBe(farid);
    expect(fromGauri.edges[0].target).toBe(gauriId);
  });

  it("returns nothing for a contact with no relationships", async () => {
    const lone = await makeContact("Hana Noedge");
    const graph = await fetchContactRelationshipGraph(lone);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});
