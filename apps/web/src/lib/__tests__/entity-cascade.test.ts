import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges, notes } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { createEntity, deleteEntity, getEntity } from "@/lib/repo/entities";
import { createNodeType, deleteNodeType, getNodeType } from "@/lib/repo/node-types";
import { createRelationshipEdge } from "@/lib/repo/relationships";

async function addEntityNote(entityId: string, body: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(notes).values({ id, entityId, kind: "text", body });
  return id;
}

/**
 * Deleting an entity mirrors "forget this person" (privacy rule: deletion
 * cascades fully): its notes are hard-deleted, rows derived from those notes
 * go with them (no receipt outlives its note), but edges that merely touch
 * the entity are tombstoned — they're part of the other endpoint's history.
 */
describe("deleteEntity cascade", () => {
  it("hard-deletes notes and note-derived edges, tombstones edges touching the entity", async () => {
    const db = await getDb();
    const typeId = await createNodeType({ name: "School", color: "#4cc38a" });
    const entityId = await createEntity({ typeId, name: "Springfield High" });
    const contactId = await createContact(
      { ...emptyExtractedContact(), name: "Casey Cascade" },
      "manual",
    );
    const noteId = await addEntityNote(entityId, "Casey studied here");
    // An edge DERIVED from the entity's note (receipt attached)…
    const derivedEdgeId = randomUUID();
    await db.insert(edges).values({
      id: derivedEdgeId,
      srcType: "contact",
      srcId: contactId,
      predicate: "studied_at",
      dstType: "entity",
      dstId: entityId,
      sourceNoteId: noteId,
    });
    // …and a MANUAL edge touching the entity (no receipt).
    const manualEdgeId = await createRelationshipEdge({
      srcId: contactId,
      srcKind: "contact",
      dstId: entityId,
      dstKind: "entity",
      predicate: "alumnus_of",
    });

    await deleteEntity(entityId);

    expect(await getEntity(entityId)).toBeNull();
    // Notes hard-deleted — an entity the user removed leaves no text behind.
    expect(await db.select().from(notes).where(eq(notes.entityId, entityId))).toHaveLength(0);
    // The note-derived edge went WITH its receipt note (FK would dangle otherwise).
    expect(await db.select().from(edges).where(eq(edges.id, derivedEdgeId))).toHaveLength(0);
    // The manual edge is tombstoned, not erased — same retirement as note deletes.
    const [manual] = await db.select().from(edges).where(eq(edges.id, manualEdgeId));
    expect(manual).toBeDefined();
    expect(manual.deletedAt).not.toBeNull();
  });
});

describe("deleteNodeType is blocked while entities of that type exist", () => {
  it("refuses while an entity remains, deletes once the type is empty", async () => {
    const typeId = await createNodeType({ name: "Club", color: "#a78bfa" });
    const entityId = await createEntity({ typeId, name: "Chess Club" });

    // WHY: deleting a type must never silently take the user's entities
    // (and their notes/edges) down with it — the FK cascade is for tenant
    // teardown, not a one-click destructive shortcut.
    expect(await deleteNodeType(typeId)).toBe(false);
    expect(await getNodeType(typeId)).not.toBeNull();

    await deleteEntity(entityId);
    expect(await deleteNodeType(typeId)).toBe(true);
    expect(await getNodeType(typeId)).toBeNull();
  });
});
