import { eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { entities, nodeTypes } from "@/lib/db/schema";
import { escapeLike } from "@/utils/escape-like";

export interface EntityCandidate {
  id: string;
  name: string;
  /** Display name of the entity's node type ("Gym", "School"). */
  typeName: string;
}

export type EntityResolution =
  | { kind: "edge"; dstId: string }
  | { kind: "suggestion"; candidateIds: string[] };

/**
 * Custom entities whose name could be what a note referred to — an exact
 * (case-insensitive) match, or any sharing the first word ("Gold's" for
 * "Gold's Gym"). Mirrors findRelationshipCandidates for people.
 */
export async function findEntityCandidates(
  objectName: string,
): Promise<EntityCandidate[]> {
  const trimmed = objectName.trim();
  if (!trimmed) return [];
  const db = await getDb();
  const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;
  const rows = await db
    .select({ id: entities.id, name: entities.name, typeName: nodeTypes.name })
    .from(entities)
    .innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId))
    .where(or(ilike(entities.name, escapeLike(trimmed)), ilike(entities.name, `${escapeLike(firstWord)}%`)))
    .limit(8);
  const lower = trimmed.toLocaleLowerCase();
  return rows.sort((a, b) => {
    const aExact = a.name.toLocaleLowerCase() === lower ? 0 : 1;
    const bExact = b.name.toLocaleLowerCase() === lower ? 0 : 1;
    return aExact - bExact || a.name.localeCompare(b.name);
  });
}

/**
 * How to handle a custom-entity object in an extracted relationship: only a
 * unique exact name match links immediately. Unlike people, an unknown entity
 * is never auto-created — creating one needs a node type only the user can
 * pick — so ambiguity AND zero matches both defer to an edge suggestion
 * (zero candidates renders as a "create it?" proposal in the inbox).
 */
export async function resolveEntityObject(
  objectName: string,
): Promise<EntityResolution> {
  const candidates = await findEntityCandidates(objectName);
  const lower = objectName.trim().toLocaleLowerCase();
  const exact = candidates.filter((c) => c.name.toLocaleLowerCase() === lower);
  if (candidates.length === 1 && exact.length === 1) {
    return { kind: "edge", dstId: candidates[0].id };
  }
  return { kind: "suggestion", candidateIds: candidates.map((c) => c.id) };
}
