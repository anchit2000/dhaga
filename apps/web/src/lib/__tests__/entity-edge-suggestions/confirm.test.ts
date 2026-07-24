import { describe, expect, it } from "vitest";
import { createEntity, getEntity } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { addNote, deleteNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import {
  listPendingConfirmations,
  resolveConfirmation,
} from "@/lib/repo/confirmations";
import { listContactRelationships } from "@/lib/repo/relationships";
import { edgeReceipt, entityRel, makeContact } from "./helpers";

describe("confirming and dismissing entity edge confirmations", () => {
  it("confirming with an existing entity writes the edge and clears the confirmation", async () => {
    const typeId = await createNodeType({ name: "Hall", color: "#6b8afd" });
    const hall = await createEntity({ typeId, name: "Riverline Hall" });
    await createEntity({ typeId, name: "Riverline Annex" });
    const me = await makeContact("Kiran Chooser");
    const noteId = await addNote(me, "text", "performed at Riverline");
    await applyExtraction(me, noteId, entityRel("Riverline", "hall"));
    const confirmation = (await listPendingConfirmations()).find(
      (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
    );
    expect(confirmation).toBeTruthy();

    await resolveConfirmation(confirmation!.id, { target: { entityId: hall } });

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe("entity");
    expect(rels[0].contactId).toBe(hall);
    // The receipt survives the deferred confirm — note deletes still cascade.
    expect(await edgeReceipt(hall)).toBe(noteId);
    expect(
      (await listPendingConfirmations()).some((c) => c.id === confirmation!.id),
    ).toBe(false);
  });

  it("confirming 'create new' makes an entity of the picked type, then links it", async () => {
    const typeId = await createNodeType({ name: "Dojo", color: "#4cc38a" });
    const me = await makeContact("Nihal Newmaker");
    const noteId = await addNote(me, "text", "spars at Windbrook Dojo");
    await applyExtraction(me, noteId, entityRel("Windbrook Dojo", "dojo"));
    const confirmation = (await listPendingConfirmations()).find(
      (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
    );
    expect(confirmation).toBeTruthy();

    const resolved = await resolveConfirmation(confirmation!.id, {
      target: { newEntity: { typeId } },
    });

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe("entity");
    expect(rels[0].name).toBe("Windbrook Dojo");
    // WHY: the id is minted in here — the confirm action needs it back to
    // revalidate /app/entities/{id}, or the new entity's pages stay stale.
    // The unified resolver tags the result with kind:"edge" (ConfirmationResult).
    expect(resolved).toEqual({ kind: "edge", dstType: "entity", dstId: rels[0].contactId });
    const created = await getEntity(rels[0].contactId);
    expect(created?.typeId).toBe(typeId);
    expect(await edgeReceipt(rels[0].contactId)).toBe(noteId);
    expect(
      (await listPendingConfirmations()).some((c) => c.id === confirmation!.id),
    ).toBe(false);
  });

  it("deleting the note drops its pending entity confirmations", async () => {
    const me = await makeContact("Della Deleter");
    const noteId = await addNote(me, "text", "visited Foglane Athenaeum");
    await applyExtraction(me, noteId, entityRel("Foglane Athenaeum", null));
    expect(
      (await listPendingConfirmations()).some(
        (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
      ),
    ).toBe(true);

    await deleteNote(noteId);
    // A deleted note's "confirm this relationship" prompt is moot.
    expect(
      (await listPendingConfirmations()).some(
        (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
      ),
    ).toBe(false);
  });
});
