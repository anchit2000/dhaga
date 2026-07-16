import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { relationshipTypes, type RelationshipTypeRow } from "@/lib/db/schema";
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
  if (existing) throw new Error(`A relationship type "${input.slug}" already exists.`);
  const id = randomUUID();
  await db.insert(relationshipTypes).values({
    id,
    slug: input.slug,
    forwardLabel: input.forwardLabel.trim(),
    inverseLabel: input.inverseLabel.trim(),
  });
  return id;
}

/** Hard delete. Edges keep their predicate slug and fall back to the built-in
 *  map / humanized slug for labels — no edge data is lost with the type. */
export async function deleteRelationshipType(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(relationshipTypes).where(eq(relationshipTypes.id, id));
}

/** The user's custom predicates as the `custom` map relationshipRole accepts. */
export async function relationshipLabelMap(): Promise<RelationshipLabelMap> {
  return buildRelationshipLabelMap(await listRelationshipTypes());
}
