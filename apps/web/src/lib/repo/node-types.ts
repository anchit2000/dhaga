import { randomUUID } from "node:crypto";
import { asc, count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { entities, nodeTypes, type NodeTypeRow } from "@/lib/db/schema";
import { toSlug } from "@/utils/slug";

export async function listNodeTypes(): Promise<NodeTypeRow[]> {
  const db = await getDb();
  return db.select().from(nodeTypes).orderBy(asc(nodeTypes.name));
}

export async function getNodeType(id: string): Promise<NodeTypeRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(nodeTypes).where(eq(nodeTypes.id, id)).limit(1);
  return row ?? null;
}

/** Slug is derived from the name and app-enforced unique per user (RLS adds
 *  user_id, so a DB unique constraint would collide across tenants). */
export async function createNodeType(input: {
  name: string;
  color: string;
}): Promise<string> {
  const db = await getDb();
  const name = input.name.trim();
  const slug = toSlug(name);
  if (!slug) throw new Error("Type name must contain letters or numbers.");
  const [existing] = await db
    .select({ id: nodeTypes.id })
    .from(nodeTypes)
    .where(eq(nodeTypes.slug, slug))
    .limit(1);
  if (existing) throw new Error(`A type named "${name}" already exists.`);
  const id = randomUUID();
  await db.insert(nodeTypes).values({ id, name, slug, color: input.color });
  return id;
}

/** Rename/recolor. The slug stays fixed at creation — it's the stable
 *  identifier other layers may key on; display name is free to change. */
export async function updateNodeType(
  id: string,
  input: { name?: string; color?: string },
): Promise<void> {
  const db = await getDb();
  const name = input.name?.trim();
  await db
    .update(nodeTypes)
    .set({
      ...(name ? { name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    })
    .where(eq(nodeTypes.id, id));
}

/** Delete is blocked while entities of this type exist — the type_id FK is
 *  ON DELETE CASCADE (tenant teardown), but a user deleting a type must never
 *  silently take its entities (and their notes/edges) down with it. */
export async function deleteNodeType(id: string): Promise<boolean> {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(entities)
    .where(eq(entities.typeId, id));
  if (n > 0) return false;
  await db.delete(nodeTypes).where(eq(nodeTypes.id, id));
  return true;
}
