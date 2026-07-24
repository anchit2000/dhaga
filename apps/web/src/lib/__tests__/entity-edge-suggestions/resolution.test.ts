import { describe, expect, it } from "vitest";
import { createEntity, listEntities } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { listContactRelationships } from "@/lib/repo/relationships";
import { edgeReceipt, entityRel, makeContact } from "./helpers";

describe("entity relationships resolve like people, but never auto-create", () => {
  it("links immediately on a unique exact name match, keeping the note receipt", async () => {
    const typeId = await createNodeType({ name: "Gym", color: "#e2a44c" });
    const entityId = await createEntity({ typeId, name: "Ironhold Temple" });
    const me = await makeContact("Uma Unique");
    const noteId = await addNote(me, "text", "I train at Ironhold Temple");
    await applyExtraction(me, noteId, entityRel("Ironhold Temple", "gym"));

    const rels = await listContactRelationships(me);
    expect(rels).toHaveLength(1);
    expect(rels[0].kind).toBe("entity");
    expect(rels[0].contactId).toBe(entityId);
    // WHY: receipts invariant — every AI-derived edge keeps source_note_id so
    // deleting the note tombstones it.
    expect(await edgeReceipt(entityId)).toBe(noteId);
    // Confident unique match links directly — it must never queue a confirmation.
    expect(
      (await listPendingConfirmations()).filter(
        (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
      ),
    ).toHaveLength(0);
  });

  it("defers to a confirmation (no edge) when the name matches more than one entity", async () => {
    const typeId = await createNodeType({ name: "Club", color: "#a78bfa" });
    const clubA = await createEntity({ typeId, name: "Peakfit Club" });
    const clubB = await createEntity({ typeId, name: "Peakfit Society" });
    const me = await makeContact("Ambika Ambiguous");
    const noteId = await addNote(me, "text", "joined Peakfit");
    await applyExtraction(me, noteId, entityRel("Peakfit", "club"));

    // WHY: with two "Peakfit"s, guessing risks linking the wrong place — no
    // edge until the user confirms which one.
    expect(await listContactRelationships(me)).toHaveLength(0);
    const mine = (await listPendingConfirmations()).find(
      (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
    );
    expect(mine).toBeTruthy();
    const payload = mine!.payload;
    if (payload.type !== "entity_link") throw new Error("expected an entity_link confirmation");
    expect(payload.apply.objectType).toBe("entity");
    expect(payload.apply.entityTypeHint).toBe("club");
    const ids = payload.options.map((o) => o.id);
    expect(ids).toContain(clubA);
    expect(ids).toContain(clubB);
    // Entity options surface their node type as the sublabel where person rows show a title.
    expect(payload.options[0].sublabel).toBe("Club");
  });

  it("proposes creation (zero candidates) when nothing matches — never auto-creates", async () => {
    const me = await makeContact("Zoya Zero");
    const noteId = await addNote(me, "text", "learning at Quietwood Dojo");
    await applyExtraction(me, noteId, entityRel("Quietwood Dojo", "dojo"));

    // WHY: unlike people, an entity needs a node type only the user can pick,
    // so an unknown name must become a proposal, not a silent new row.
    expect(await listContactRelationships(me)).toHaveLength(0);
    expect((await listEntities()).some((e) => e.name === "Quietwood Dojo")).toBe(false);
    const mine = (await listPendingConfirmations()).find(
      (c) => c.payload.type === "entity_link" && c.payload.apply.srcContactId === me,
    );
    expect(mine).toBeTruthy();
    const payload = mine!.payload;
    if (payload.type !== "entity_link") throw new Error("expected an entity_link confirmation");
    expect(payload.apply.objectType).toBe("entity");
    expect(payload.options).toHaveLength(0);
    expect(payload.apply.entityTypeHint).toBe("dojo");
  });
});
