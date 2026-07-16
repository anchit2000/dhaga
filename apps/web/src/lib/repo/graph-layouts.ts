import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { graphLayouts } from "@/lib/db/schema";
import { GRAPH_LAYOUT_DEFAULT_KEY } from "@/utils/constants/graph";
import type { GraphLayoutSnapshot } from "./graph-data/types";

/** The user's saved layout (RLS scopes the row set per tenant), or null. */
export async function getLayout(): Promise<GraphLayoutSnapshot | null> {
  const db = await getDb();
  const [row] = await db
    .select({ hash: graphLayouts.graphHash, positions: graphLayouts.positions })
    .from(graphLayouts)
    .where(eq(graphLayouts.key, GRAPH_LAYOUT_DEFAULT_KEY))
    .limit(1);
  return row ?? null;
}

/**
 * Insert-or-replace the single per-user layout row. Raw SQL targeting the
 * constraint BY NAME, not by column list: graph_layouts_scope_key is
 * UNIQUE (key) when self-hosted but UNIQUE (user_id, key) under EE's RLS
 * (packages/ee/src/db/rls-ddl.ts), and naming the constraint resolves
 * correctly in both modes without this function knowing which is active —
 * the same reasoning as setSetting's settings_pkey upsert (see settings.ts).
 */
export async function upsertLayout(
  hash: string,
  positions: Record<string, [number, number]>,
): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into graph_layouts (id, key, graph_hash, positions, updated_at)
    values (${randomUUID()}, ${GRAPH_LAYOUT_DEFAULT_KEY}, ${hash}, ${JSON.stringify(positions)}::jsonb, now())
    on conflict on constraint graph_layouts_scope_key
    do update set graph_hash = excluded.graph_hash, positions = excluded.positions, updated_at = excluded.updated_at
  `);
}
