import { randomUUID } from "node:crypto";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { edges, relationshipTypes, type RelationshipTypeRow } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import { buildRelationshipLabelMap, type RelationshipLabelMap } from "@dhaga/core";

export async function listRelationshipTypes(): Promise<RelationshipTypeRow[]> {
  const db = await getDb();
  return db.select().from(relationshipTypes).orderBy(asc(relationshipTypes.slug));
}

export async function getRelationshipType(id: string): Promise<RelationshipTypeRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(relationshipTypes)
    .where(eq(relationshipTypes.id, id))
    .limit(1);
  return row ?? null;
}

/** Slug uniqueness is app-enforced per user (RLS adds user_id, so a DB
 *  unique on slug would collide across tenants). Callers validate the slug
 *  shape (PREDICATE_SLUG_PATTERN) before calling. */
export async function createRelationshipType(input: {
  slug: string;
  forwardLabel: string;
  inverseLabel: string;
}): Promise<string> {
  const db = await getDb();
  const [existing] = await db
    .select({ id: relationshipTypes.id })
    .from(relationshipTypes)
    .where(eq(relationshipTypes.slug, input.slug))
    .limit(1);
  if (existing) throw new PreconditionError(`A relationship type "${input.slug}" already exists.`);
  const id = randomUUID();
  await db.insert(relationshipTypes).values({
    id,
    slug: input.slug,
    forwardLabel: input.forwardLabel.trim(),
    inverseLabel: input.inverseLabel.trim(),
  });
  return id;
}

/** Rename. The slug stays fixed at creation — edges reference it by slug,
 *  not by this row's id, so relabeling never touches edge data. */
export async function updateRelationshipType(
  id: string,
  input: { forwardLabel?: string; inverseLabel?: string },
): Promise<void> {
  const db = await getDb();
  const forwardLabel = input.forwardLabel?.trim();
  const inverseLabel = input.inverseLabel?.trim();
  await db
    .update(relationshipTypes)
    .set({
      ...(forwardLabel ? { forwardLabel } : {}),
      ...(inverseLabel ? { inverseLabel } : {}),
    })
    .where(eq(relationshipTypes.id, id));
}

/** Delete is blocked while edges use this predicate — edges keep their slug
 *  as free text (no FK), but a user deleting a type must not silently orphan
 *  the label on live relationships. */
export async function deleteRelationshipType(id: string): Promise<boolean> {
  const db = await getDb();
  const type = await getRelationshipType(id);
  if (!type) return false;
  const [{ n }] = await db
    .select({ n: count() })
    .from(edges)
    .where(and(eq(edges.predicate, type.slug), isNull(edges.deletedAt)));
  if (n > 0) return false;
  await db.delete(relationshipTypes).where(eq(relationshipTypes.id, id));
  return true;
}

/** Edge count per predicate slug, for the manager UI's usage counts. Only
 *  live (non-deleted) edges count. */
export async function relationshipTypeUsageCounts(): Promise<Map<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({ predicate: edges.predicate, n: count() })
    .from(edges)
    .where(isNull(edges.deletedAt))
    .groupBy(edges.predicate);
  return new Map(rows.map((row) => [row.predicate, Number(row.n)]));
}

/** The user's custom predicates as the `custom` map relationshipRole accepts. */
export async function relationshipLabelMap(): Promise<RelationshipLabelMap> {
  return buildRelationshipLabelMap(await listRelationshipTypes());
}
