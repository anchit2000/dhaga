"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { listAiCreditActivityPage } from "@/lib/repo/ai-usage";
import { AI_ACTIVITY_LIMIT } from "@/utils/constants/ai-credits";

/** Opaque keyset position into `ai_actions`, dates as ISO strings — a `Date`
 *  doesn't round-trip through the server-action boundary, so both this and
 *  `AiCreditActivityRowDto` below carry `at` as a string, converted right at
 *  the edge from the `Date` the repo layer works in. */
export interface AiCreditActivityCursor {
  at: string;
  id: string;
}

export interface AiCreditActivityRowDto {
  id: string;
  label: string;
  credits: number;
  free: boolean;
  at: string;
}

/**
 * One "Load more" page of the acting user's own AI-credit history
 * (/app/settings#credits). Strictly the caller's own usage: `withUserDb`
 * scopes the read to `requireUserId()`'s id, the same as every other action
 * in this file's neighbors — no user id is ever taken from the client.
 */
export async function getAiCreditActivityPageAction(
  cursor: AiCreditActivityCursor | null,
): Promise<{ rows: AiCreditActivityRowDto[]; nextCursor: AiCreditActivityCursor | null }> {
  const userId = await requireUserId();
  const page = await withUserDb(userId, () =>
    listAiCreditActivityPage({
      cursor: cursor ? { at: new Date(cursor.at), id: cursor.id } : null,
      limit: AI_ACTIVITY_LIMIT,
    }),
  );
  return {
    rows: page.rows.map((row) => ({ ...row, at: row.at.toISOString() })),
    nextCursor: page.nextCursor
      ? { at: page.nextCursor.at.toISOString(), id: page.nextCursor.id }
      : null,
  };
}
