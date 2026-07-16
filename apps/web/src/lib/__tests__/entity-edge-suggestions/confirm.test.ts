import { describe, expect, it } from "vitest";
import { createEntity, getEntity } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { addNote, deleteNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import {
  confirmEdgeSuggestion,
  listPendingEdgeSuggestions,
} from "@/lib/repo/edge-suggestions";
import { listContactRelationships } from "@/lib/repo/relationships";
import { edgeReceipt, entityRel, makeContact } from "./helpers";

describe("confirming and dismissing entity edge suggestions", () => {
  it("confirming with an existing entity writes the edge and clears the suggestion", async () => {
    const typeId = await createNodeType({ name: "Hall", color: "#6b8afd" });
    const hall = await createEntity({ typeId, name: "Riverline Hall" });
    await createEntity({ typeId, name: "Riverline Annex" });
    const me = await makeContact("Kiran Chooser");
    const noteId = await addNote(me, "text", "performed at Riverline");
    await applyExtraction(me, noteId, entityRel("Riverline", "hall"));
    const suggestion = (await listPendingEdgeSuggestions()).find(
      (s) => s.srcContactId === me,
    );
    expect(suggestion).toBeTruthy();

    await confirmEdgeSuggestion(suggestion!.id, { entityId: hall });

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe("entity");
    expect(rels[0].contactId).toBe(hall);
    // The receipt survives the deferred confirm — note deletes still cascade.
    expect(await edgeReceipt(hall)).toBe(noteId);
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.id === suggestion!.id),
    ).toBe(false);
  });

  it("confirming 'create new' makes an entity of the picked type, then links it", async () => {
    const typeId = await createNodeType({ name: "Dojo", color: "#4cc38a" });
    const me = await makeContact("Nihal Newmaker");
    const noteId = await addNote(me, "text", "spars at Windbrook Dojo");
    await applyExtraction(me, noteId, entityRel("Windbrook Dojo", "dojo"));
    const suggestion = (await listPendingEdgeSuggestions()).find(
      (s) => s.srcContactId === me,
    );
    expect(suggestion).toBeTruthy();

    const resolved = await confirmEdgeSuggestion(suggestion!.id, { newEntity: { typeId } });

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe("entity");
    expect(rels[0].name).toBe("Windbrook Dojo");
    // WHY: the id is minted in here — the confirm action needs it back to
    // revalidate /app/entities/{id}, or the new entity's pages stay stale.
    expect(resolved).toEqual({ dstType: "entity", dstId: rels[0].contactId });
    const created = await getEntity(rels[0].contactId);
    expect(created?.typeId).toBe(typeId);
    expect(await edgeReceipt(rels[0].contactId)).toBe(noteId);
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.id === suggestion!.id),
    ).toBe(false);
  });

  it("deleting the note drops its pending entity suggestions", async () => {
    const me = await makeContact("Della Deleter");
    const noteId = await addNote(me, "text", "visited Foglane Athenaeum");
    await applyExtraction(me, noteId, entityRel("Foglane Athenaeum", null));
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.srcContactId === me),
    ).toBe(true);

    await deleteNote(noteId);
    // A deleted note's "confirm this relationship" prompt is moot.
    expect(
      (await listPendingEdgeSuggestions()).some((s) => s.srcContactId === me),
    ).toBe(false);
  });
});
