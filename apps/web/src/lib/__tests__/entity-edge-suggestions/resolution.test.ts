import { describe, expect, it } from "vitest";
import { createEntity, listEntities } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import { addNote } from "@/lib/repo/notes";
import { applyExtraction } from "@/lib/repo/graph";
import { listPendingEdgeSuggestions } from "@/lib/repo/edge-suggestions";
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
    expect(
      (await listPendingEdgeSuggestions()).filter((s) => s.srcContactId === me),
    ).toHaveLength(0);
  });

  it("defers to a suggestion (no edge) when the name matches more than one entity", async () => {
    const typeId = await createNodeType({ name: "Club", color: "#a78bfa" });
    const clubA = await createEntity({ typeId, name: "Peakfit Club" });
    const clubB = await createEntity({ typeId, name: "Peakfit Society" });
    const me = await makeContact("Ambika Ambiguous");
    const noteId = await addNote(me, "text", "joined Peakfit");
    await applyExtraction(me, noteId, entityRel("Peakfit", "club"));

    // WHY: with two "Peakfit"s, guessing risks linking the wrong place — no
    // edge until the user confirms which one.
    expect(await listContactRelationships(me)).toHaveLength(0);
    const mine = (await listPendingEdgeSuggestions()).find((s) => s.srcContactId === me);
    expect(mine?.objectType).toBe("entity");
    expect(mine?.entityTypeHint).toBe("club");
    const ids = mine?.candidates.map((c) => c.id) ?? [];
    expect(ids).toContain(clubA);
    expect(ids).toContain(clubB);
    // Entity candidates surface their node type where person rows show a title.
    expect(mine?.candidates[0].title).toBe("Club");
  });

  it("proposes creation (zero candidates) when nothing matches — never auto-creates", async () => {
    const me = await makeContact("Zoya Zero");
    const noteId = await addNote(me, "text", "learning at Quietwood Dojo");
    await applyExtraction(me, noteId, entityRel("Quietwood Dojo", "dojo"));

    // WHY: unlike people, an entity needs a node type only the user can pick,
    // so an unknown name must become a proposal, not a silent new row.
    expect(await listContactRelationships(me)).toHaveLength(0);
    expect((await listEntities()).some((e) => e.name === "Quietwood Dojo")).toBe(false);
    const mine = (await listPendingEdgeSuggestions()).find((s) => s.srcContactId === me);
    expect(mine?.objectType).toBe("entity");
    expect(mine?.candidates).toHaveLength(0);
    expect(mine?.entityTypeHint).toBe("dojo");
  });
});
