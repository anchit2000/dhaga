import { describe, expect, it } from "vitest";
import { createContact, forgetContact, getContact } from "@/lib/repo/contacts";
import { addNote, deleteNote, listFacts, listOpenFollowUps } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { fetchGraphView } from "@/lib/repo/graph-data";
import type { NoteExtraction } from "@dhaga/core";

const contactInput = {
  name: "Rohan Mehta",
  title: "Head of Ops",
  company: "Freightline",
  emails: [],
  phones: [],
  links: [],
  location: null,
};

const extraction: NoteExtraction = {
  facts: [
    { type: "role", text: "Runs operations for a freight forwarder", confidence: 0.9 },
  ],
  relationships: [
    { subject: "contact", predicate: "works_at", object: "Freightline", object_type: "company" },
    { subject: "contact", predicate: "knows", object: "Mei Tanaka", object_type: "person" },
  ],
  follow_ups: [{ action: "Send route-optimisation deck", due_hint: "next quarter" }],
  tags: ["logistics"],
};

/**
 * The receipts invariant is the product's trust story (BRD §6.3/§7.5):
 * every derived row points at its note; nothing derived outlives its
 * source; forgetting a person leaves no trace.
 */
describe("graph receipts and cascades", () => {
  it("extraction writes facts with the note as receipt", async () => {
    const id = await createContact(contactInput, "manual");
    const noteId = await addNote(id, "text", "met at the summit");
    await applyExtraction(id, noteId, extraction);

    const facts = await listFacts(id);
    // role fact + unresolved-person relationship stored as a fact
    expect(facts).toHaveLength(2);
    for (const fact of facts) expect(fact.sourceNoteId).toBe(noteId);
    expect(facts.some((fact) => fact.text.includes("knows Mei Tanaka"))).toBe(true);

    const followUps = await listOpenFollowUps(id);
    expect(followUps).toHaveLength(1);
    expect(followUps[0].dueHint).toBe("next quarter");

    const detail = await getContact(id);
    expect(detail?.contact.tags).toContain("logistics");
    expect(detail?.companyName).toBe("Freightline");

    // company relationship became a graph edge
    const graph = await fetchGraphView();
    expect(
      graph.edges.some((edge) => edge.source === id && edge.label === "works at"),
    ).toBe(true);
  });

  it("deleting a note tombstones everything it derived", async () => {
    const id = await createContact({ ...contactInput, name: "Second Person" }, "manual");
    const noteId = await addNote(id, "text", "another note");
    await applyExtraction(id, noteId, extraction);
    expect(await listFacts(id)).not.toHaveLength(0);

    await deleteNote(noteId);
    expect(await listFacts(id)).toHaveLength(0);
  });

  it("forgetting a person removes them from the graph entirely", async () => {
    const id = await createContact({ ...contactInput, name: "Third Person" }, "manual");
    const noteId = await addNote(id, "text", "to be forgotten");
    await applyExtraction(id, noteId, extraction);

    await forgetContact(id);
    expect(await getContact(id)).toBeNull();
    const graph = await fetchGraphView();
    expect(graph.nodes.some((node) => node.id === id)).toBe(false);
    expect(
      graph.edges.some((edge) => edge.source === id || edge.target === id),
    ).toBe(false);
  });
});
