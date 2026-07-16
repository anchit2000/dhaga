import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  edgeSuggestions,
  edges,
  entities,
  facts,
  followUps,
  nodeTypes,
  notes,
  type EntityRow,
} from "@/lib/db/schema";
import { deleteEmbeddingsForNote } from "./embeddings";

export interface EntityWithType extends EntityRow {
  typeName: string;
  typeSlug: string;
  typeColor: string;
}

const withTypeSelect = {
  id: entities.id,
  typeId: entities.typeId,
  name: entities.name,
  description: entities.description,
  createdAt: entities.createdAt,
  updatedAt: entities.updatedAt,
  typeName: nodeTypes.name,
  typeSlug: nodeTypes.slug,
  typeColor: nodeTypes.color,
};

export async function listEntities(): Promise<EntityWithType[]> {
  const db = await getDb();
  return db
    .select(withTypeSelect)
    .from(entities)
    .innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId))
    .orderBy(asc(entities.name));
}

export async function getEntity(id: string): Promise<EntityWithType | null> {
  const db = await getDb();
  const [row] = await db
    .select(withTypeSelect)
    .from(entities)
    .innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId))
    .where(eq(entities.id, id))
    .limit(1);
  return row ?? null;
}

export async function createEntity(input: {
  typeId: string;
  name: string;
  description?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(entities).values({
    id,
    typeId: input.typeId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
  });
  return id;
}

export async function updateEntity(
  id: string,
  input: { name?: string; description?: string | null; typeId?: string },
): Promise<void> {
  const db = await getDb();
  const name = input.name?.trim();
  await db
    .update(entities)
    .set({
      ...(name ? { name } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.typeId ? { typeId: input.typeId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(entities.id, id));
}

/**
 * Hard-delete an entity, mirroring forgetContact's cascade semantics (see
 * repo/contacts/mutations.ts): rows derived from its notes go first so no
 * receipt outlives its note, its notes are hard-deleted, but edges that merely
 * *touch* the entity are tombstoned (deleted_at) — they belong to the other
 * endpoint's history too. One transaction, all-or-nothing: every statement is
 * a pure DB write, and a partial cascade would strand an entity that can
 * neither be used nor deleted.
 */
export async function deleteEntity(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const noteIds = (
      await tx.select({ id: notes.id }).from(notes).where(eq(notes.entityId, id))
    ).map((row) => row.id);
    if (noteIds.length > 0) {
      // Hard-delete note derivations (edges included — their receipt note is
      // about to go, and a tombstone may not keep a dangling FK).
      await tx.delete(edges).where(inArray(edges.sourceNoteId, noteIds));
      await tx.delete(facts).where(inArray(facts.sourceNoteId, noteIds));
      await tx.delete(followUps).where(inArray(followUps.sourceNoteId, noteIds));
      await tx.delete(edgeSuggestions).where(inArray(edgeSuggestions.sourceNoteId, noteIds));
    }
    await tx
      .update(edges)
      .set({ deletedAt: now })
      .where(
        and(
          isNull(edges.deletedAt),
          or(
            and(eq(edges.srcType, "entity"), eq(edges.srcId, id)),
            and(eq(edges.dstType, "entity"), eq(edges.dstId, id)),
          ),
        ),
      );
    for (const noteId of noteIds) await deleteEmbeddingsForNote(noteId, tx);
    await tx.delete(notes).where(eq(notes.entityId, id));
    await tx.delete(entities).where(eq(entities.id, id));
  });
}
