import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, edgeSuggestions } from "@/lib/db/schema";
import { createMentionedContact, type RelationshipCandidate } from "./candidates";

export interface EdgeSuggestionView {
  id: string;
  srcContactId: string;
  srcName: string;
  predicate: string;
  objectName: string;
  createdAt: Date;
  candidates: RelationshipCandidate[];
}

/** Pending relationship confirmations, newest first, with candidates resolved. */
export async function listPendingEdgeSuggestions(): Promise<EdgeSuggestionView[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: edgeSuggestions.id,
      srcContactId: edgeSuggestions.srcContactId,
      srcName: contacts.name,
      predicate: edgeSuggestions.predicate,
      objectName: edgeSuggestions.objectName,
      candidateIds: edgeSuggestions.candidateIds,
      createdAt: edgeSuggestions.createdAt,
    })
    .from(edgeSuggestions)
    .innerJoin(contacts, eq(contacts.id, edgeSuggestions.srcContactId))
    .where(eq(edgeSuggestions.status, "pending"))
    .orderBy(desc(edgeSuggestions.createdAt));
  if (rows.length === 0) return [];

  const candidateIds = [...new Set(rows.flatMap((row) => row.candidateIds))];
  const candidateRows = candidateIds.length
    ? await db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title })
        .from(contacts)
        .where(inArray(contacts.id, candidateIds))
    : [];
  const byId = new Map(candidateRows.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    srcContactId: row.srcContactId,
    srcName: row.srcName,
    predicate: row.predicate,
    objectName: row.objectName,
    createdAt: row.createdAt,
    candidates: row.candidateIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is RelationshipCandidate => Boolean(candidate)),
  }));
}

/**
 * Resolve a pending suggestion by writing the edge — to a chosen existing
 * contact, or to a freshly created one when the user says none of the
 * candidates match. Keeps the note receipt so a note delete still tombstones it.
 */
export async function confirmEdgeSuggestion(
  suggestionId: string,
  target: { contactId: string } | { newContact: true },
): Promise<void> {
  const db = await getDb();
  const [suggestion] = await db
    .select()
    .from(edgeSuggestions)
    .where(and(eq(edgeSuggestions.id, suggestionId), eq(edgeSuggestions.status, "pending")))
    .limit(1);
  if (!suggestion) return;

  const dstId =
    "contactId" in target
      ? target.contactId
      : await createMentionedContact(suggestion.objectName);

  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId: suggestion.srcContactId,
    predicate: suggestion.predicate,
    dstType: "person",
    dstId,
    sourceNoteId: suggestion.sourceNoteId,
  });
  await db
    .update(edgeSuggestions)
    .set({ status: "confirmed", resolvedAt: new Date() })
    .where(eq(edgeSuggestions.id, suggestionId));
}

export async function dismissEdgeSuggestion(suggestionId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(edgeSuggestions)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(and(eq(edgeSuggestions.id, suggestionId), eq(edgeSuggestions.status, "pending")));
}
