import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import type { NoteExtraction } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import {
  confirmEdgeSuggestion,
  dismissEdgeSuggestion,
  listPendingEdgeSuggestions,
} from "@/lib/repo/edge-suggestions";
import { listContactRelationships } from "@/lib/repo/relationships";

function knows(objectName: string): NoteExtraction {
  return {
    facts: [],
    relationships: [
      { subject: "contact", predicate: "knows", object: objectName, object_type: "person" },
    ],
    follow_ups: [],
    tags: [],
  };
}

async function makeContact(name: string): Promise<string> {
  return createContact({ ...emptyExtractedContact(), name }, "manual");
}

describe("ambiguous person relationships defer to a confirmation", () => {
  it("creates a pending suggestion (no edge) when the name matches two contacts", async () => {
    const me = await makeContact("Meera Suggest");
    const ajayA = await makeContact("Ajay Kumar Suggest");
    const ajayB = await makeContact("Ajay Singh Suggest");
    const note = await addNote(me, "text", "I know Ajay");
    await applyExtraction(me, note, knows("Ajay"));

    // WHY: with two "Ajay"s, guessing risks linking the wrong person — so no
    // edge is written until the user confirms which one.
    expect(await listContactRelationships(me)).toHaveLength(0);

    const mine = (await listPendingEdgeSuggestions()).find((s) => s.srcContactId === me);
    expect(mine).toBeTruthy();
    expect(mine?.objectName).toBe("Ajay");
    const candidateIds = mine?.candidates.map((c) => c.id) ?? [];
    expect(candidateIds).toContain(ajayA);
    expect(candidateIds).toContain(ajayB);
  });

  it("confirming links the edge to the chosen contact and clears the suggestion", async () => {
    const me = await makeContact("Nina Confirm");
    await makeContact("Ajay Alpha Confirm");
    const ajayB = await makeContact("Ajay Beta Confirm");
    const note = await addNote(me, "text", "I know Ajay");
    await applyExtraction(me, note, knows("Ajay"));
    const suggestion = (await listPendingEdgeSuggestions()).find((s) => s.srcContactId === me);
    expect(suggestion).toBeTruthy();

    await confirmEdgeSuggestion(suggestion!.id, { contactId: ajayB });

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].contactId).toBe(ajayB);
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.id === suggestion!.id),
    ).toBe(false);
  });

  it("dismissing drops the suggestion without ever writing an edge", async () => {
    const me = await makeContact("Omar Dismiss");
    await makeContact("Ajay Gamma Dismiss");
    await makeContact("Ajay Delta Dismiss");
    const note = await addNote(me, "text", "I know Ajay");
    await applyExtraction(me, note, knows("Ajay"));
    const suggestion = (await listPendingEdgeSuggestions()).find((s) => s.srcContactId === me);
    expect(suggestion).toBeTruthy();

    await dismissEdgeSuggestion(suggestion!.id);
    expect(await listContactRelationships(me)).toHaveLength(0);
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.id === suggestion!.id),
    ).toBe(false);
  });
});
