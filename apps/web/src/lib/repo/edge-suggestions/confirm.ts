import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { edges, edgeSuggestions } from "@/lib/db/schema";
import { createMentionedContact } from "./candidates";
import { createEntity } from "../entities";

/** Where a confirmed suggestion should point: an existing contact/entity, a
 *  fresh "mentioned" contact, or a new entity of the user-picked node type. */
export type EdgeSuggestionTarget =
  | { contactId: string }
  | { newContact: true }
  | { entityId: string }
  | { newEntity: { typeId: string } };

async function resolveTarget(
  target: EdgeSuggestionTarget,
  objectName: string,
): Promise<{ dstType: "contact" | "entity"; dstId: string }> {
  if ("contactId" in target) return { dstType: "contact", dstId: target.contactId };
  if ("newContact" in target) {
    return { dstType: "contact", dstId: await createMentionedContact(objectName) };
  }
  if ("entityId" in target) return { dstType: "entity", dstId: target.entityId };
  return {
    dstType: "entity",
    dstId: await createEntity({ typeId: target.newEntity.typeId, name: objectName }),
  };
}

/**
 * Resolve a pending suggestion by writing the edge — to a chosen existing
 * contact/entity, or to a freshly created one when the user says none of the
 * candidates match (new entities need the node type the user picked). Keeps
 * the note receipt so a note delete still tombstones it. Returns the resolved
 * destination (ids minted here are otherwise invisible to the caller, which
 * needs them to revalidate the right pages), or null when nothing was pending.
 */
export async function confirmEdgeSuggestion(
  suggestionId: string,
  target: EdgeSuggestionTarget,
): Promise<{ dstType: "contact" | "entity"; dstId: string } | null> {
  const db = await getDb();
  const [suggestion] = await db
    .select()
    .from(edgeSuggestions)
    .where(and(eq(edgeSuggestions.id, suggestionId), eq(edgeSuggestions.status, "pending")))
    .limit(1);
  if (!suggestion) return null;

  const { dstType, dstId } = await resolveTarget(target, suggestion.objectName);
  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId: suggestion.srcContactId,
    predicate: suggestion.predicate,
    dstType,
    dstId,
    sourceNoteId: suggestion.sourceNoteId,
  });
  await db
    .update(edgeSuggestions)
    .set({ status: "confirmed", resolvedAt: new Date() })
    .where(eq(edgeSuggestions.id, suggestionId));
  return { dstType, dstId };
}

export async function dismissEdgeSuggestion(suggestionId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(edgeSuggestions)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(and(eq(edgeSuggestions.id, suggestionId), eq(edgeSuggestions.status, "pending")));
}
