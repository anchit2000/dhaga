import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edgeSuggestions, entities, nodeTypes } from "@/lib/db/schema";
import type { RelationshipCandidate } from "./candidates";

export interface EdgeSuggestionView {
  id: string;
  srcContactId: string;
  srcName: string;
  predicate: string;
  objectName: string;
  /** What the note's object is: a person (contact) or a custom entity. */
  objectType: "person" | "entity";
  /** Entity suggestions only: the extractor's node-type guess (slug), if any. */
  entityTypeHint: string | null;
  createdAt: Date;
  /** Person rows: matching contacts (title = job title). Entity rows: matching
   *  entities (title = node type name) — the inbox renders both uniformly. */
  candidates: RelationshipCandidate[];
}

async function candidateIndex(
  rows: { objectType: string; candidateIds: string[] }[],
): Promise<Map<string, RelationshipCandidate>> {
  const db = await getDb();
  const idsFor = (type: "person" | "entity"): string[] => [
    ...new Set(
      rows
        .filter((row) => (row.objectType === "entity") === (type === "entity"))
        .flatMap((row) => row.candidateIds),
    ),
  ];
  const personIds = idsFor("person");
  const entityIds = idsFor("entity");
  const contactRows = personIds.length
    ? await db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title })
        .from(contacts)
        .where(inArray(contacts.id, personIds))
    : [];
  const entityRows = entityIds.length
    ? await db
        .select({ id: entities.id, name: entities.name, typeName: nodeTypes.name })
        .from(entities)
        .innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId))
        .where(inArray(entities.id, entityIds))
    : [];
  return new Map<string, RelationshipCandidate>([
    ...contactRows.map((row): [string, RelationshipCandidate] => [row.id, row]),
    ...entityRows.map((row): [string, RelationshipCandidate] => [
      row.id,
      { id: row.id, name: row.name, title: row.typeName },
    ]),
  ]);
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
      objectType: edgeSuggestions.objectType,
      entityTypeHint: edgeSuggestions.entityTypeHint,
      candidateIds: edgeSuggestions.candidateIds,
      createdAt: edgeSuggestions.createdAt,
    })
    .from(edgeSuggestions)
    .innerJoin(contacts, eq(contacts.id, edgeSuggestions.srcContactId))
    .where(eq(edgeSuggestions.status, "pending"))
    .orderBy(desc(edgeSuggestions.createdAt));
  if (rows.length === 0) return [];

  const byId = await candidateIndex(rows);
  return rows.map((row) => ({
    id: row.id,
    srcContactId: row.srcContactId,
    srcName: row.srcName,
    predicate: row.predicate,
    objectName: row.objectName,
    objectType: row.objectType === "entity" ? "entity" : "person",
    entityTypeHint: row.entityTypeHint,
    createdAt: row.createdAt,
    candidates: row.candidateIds
      .map((id) => byId.get(id))
      .filter((candidate): candidate is RelationshipCandidate => Boolean(candidate)),
  }));
}
