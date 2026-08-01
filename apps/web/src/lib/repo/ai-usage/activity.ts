import { and, desc, eq, lt, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import { toActivityRow } from "./shared";
import type { AiCreditActivityRow } from "@/types";

/**
 * The credits history page, one keyset page at a time — what the "Recent
 * activity" list on /app/settings#credits pages through via "Load more".
 *
 * `ai_actions` is append-only and never pruned, so this is the piece that has
 * to stay flat for the life of an account: an OFFSET-based page gets slower
 * every month as the table grows, but `WHERE (created_at, id) < cursor ORDER
 * BY created_at DESC, id DESC LIMIT n` always walks exactly `n` rows off the
 * `ai_actions_created_idx` / `ai_actions_user_created_idx` indexes regardless
 * of how many rows came before the cursor. `id` breaks ties within a
 * `created_at` timestamp (two actions can land in the same millisecond).
 *
 * Fetches one extra row to learn whether there is a next page without a
 * separate COUNT query.
 */
export async function listAiCreditActivityPage(opts: {
  cursor: { at: Date; id: string } | null;
  limit: number;
}): Promise<{ rows: AiCreditActivityRow[]; nextCursor: { at: Date; id: string } | null }> {
  const db = await getDb();
  const { cursor, limit } = opts;

  const pageRows = await db
    .select({ id: aiActions.id, feature: aiActions.feature, createdAt: aiActions.createdAt })
    .from(aiActions)
    .where(
      cursor
        ? or(
            lt(aiActions.createdAt, cursor.at),
            and(eq(aiActions.createdAt, cursor.at), lt(aiActions.id, cursor.id)),
          )
        : undefined,
    )
    .orderBy(desc(aiActions.createdAt), desc(aiActions.id))
    .limit(limit + 1);

  const hasMore = pageRows.length > limit;
  const rows: AiCreditActivityRow[] = pageRows.slice(0, limit).map(toActivityRow);

  const last = rows.at(-1);
  const nextCursor = hasMore && last ? { at: last.at, id: last.id } : null;

  return { rows, nextCursor };
}
