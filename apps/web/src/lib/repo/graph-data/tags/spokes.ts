import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { GRAPH_TAG_SPOKE_CAP } from "@/utils/constants/graph";
import { toSlug } from "@/utils/slug";
import { slugOf, tagRows } from "./rows";
import type { TagSpokesPayload } from "../types";

/**
 * One tag's spokes (GET /api/graph/tags?tag={slug}) for click-to-load on a
 * truncated graph. Capped at GRAPH_TAG_SPOKE_CAP in deterministic contact-id
 * order; the hub keeps its TRUE memberCount so the client can show "+N more".
 * `spokeCap` is injectable for tests only.
 */
export async function fetchTagSpokes(
  tag: string,
  spokeCap: number = GRAPH_TAG_SPOKE_CAP,
): Promise<TagSpokesPayload> {
  const requested = toSlug(tag); // idempotent on canonical slugs
  const db = await getDb();
  const rows = tagRows(db);
  const slug = slugOf(rows.tag);

  const [[hubRow], memberRows] = await Promise.all([
    db
      .select({
        label: sql<string | null>`min(${rows.tag} collate "C")`,
        memberCount: sql<number>`count(distinct ${rows.contactId})::int`,
      })
      .from(rows)
      .where(eq(slug, requested)),
    db
      .selectDistinct({ contactId: rows.contactId })
      .from(rows)
      .where(eq(slug, requested))
      .orderBy(asc(rows.contactId))
      .limit(spokeCap),
  ]);

  return {
    hub: {
      id: `tag:${requested}`,
      label: hubRow?.label ?? tag,
      slug: requested,
      memberCount: hubRow?.memberCount ?? 0,
    },
    edges: memberRows.map((row) => ({
      id: `tagged:${requested}:${row.contactId}`,
      source: row.contactId,
      target: `tag:${requested}`,
    })),
  };
}
