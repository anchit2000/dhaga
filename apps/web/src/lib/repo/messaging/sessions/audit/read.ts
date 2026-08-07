import { and, desc, eq, lt, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems } from "@/lib/db/schema";
import type { MessagingItemOutcome } from "@/utils/constants/messaging";

/**
 * The capture log's reads: every batch a sender ever forwarded and what it
 * became. Same tenancy contract as ../read — called only inside a
 * withUserDb(userId) scope, so RLS scopes every row. NEVER logs the payload.
 *
 * Paginated by KEYSET, not OFFSET. A chatty sender accumulates batches without
 * bound, and `OFFSET n` makes Postgres walk and discard n rows on every page —
 * page 50 costs fifty times page 1. `(created_at, id) < cursor` reads only the
 * page it returns, forever, straight off the (created_at DESC, id DESC) index
 * added in db/ddl/core/messaging.ts. The id is part of the key because
 * created_at alone is not unique: two batches opened in the same millisecond
 * would otherwise straddle a page boundary and one would be skipped entirely.
 */

/** Where the next page starts. Opaque to the UI, which just echoes it back. */
export interface CaptureLogCursor {
  createdAt: Date;
  id: string;
}

/** One batch as the log lists it. The counts are computed inside the same query
 *  rather than by a per-row follow-up: a page of 20 batches must cost ONE query,
 *  not 21 (this repo has exhausted its three-connection tenant pool that way). */
export interface CaptureLogEntry {
  id: string;
  provider: string;
  status: string;
  createdAt: Date;
  processedAt: Date | null;
  summary: string | null;
  error: string | null;
  itemCount: number;
  /** Messages still carrying no verdict — a batch that never finished. */
  unresolvedCount: number;
}

export interface CaptureLogPage {
  entries: CaptureLogEntry[];
  /** Cursor for the following page; null when this was the last one. */
  nextCursor: CaptureLogCursor | null;
}

const entryColumns = {
  id: messagingSessions.id,
  provider: messagingSessions.provider,
  status: messagingSessions.status,
  createdAt: messagingSessions.createdAt,
  processedAt: messagingSessions.processedAt,
  summary: messagingSessions.summary,
  error: messagingSessions.error,
  itemCount: sql<number>`(
    select count(*)::int from ${messagingSessionItems} i
     where i.session_id = ${messagingSessions.id}
  )`,
  unresolvedCount: sql<number>`(
    select count(*)::int from ${messagingSessionItems} i
     where i.session_id = ${messagingSessions.id} and i.outcome_kind is null
  )`,
} as const;

/**
 * One page of batches, newest first. `limit` is the page SIZE; one extra row is
 * fetched to decide whether a next page exists — cheaper than a second COUNT(*)
 * over the whole table, which is the other classic way this page stops scaling.
 */
export async function listCaptureLog(input: {
  limit: number;
  cursor?: CaptureLogCursor | null;
}): Promise<CaptureLogPage> {
  const db = await getDb();
  const { limit, cursor } = input;
  const keyset = cursor
    ? or(
        lt(messagingSessions.createdAt, cursor.createdAt),
        and(eq(messagingSessions.createdAt, cursor.createdAt), lt(messagingSessions.id, cursor.id)),
      )
    : undefined;
  const rows = await db
    .select(entryColumns)
    .from(messagingSessions)
    .where(keyset)
    .orderBy(desc(messagingSessions.createdAt), desc(messagingSessions.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const last = entries.at(-1);
  return {
    entries,
    nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

/**
 * Batches that never reached a terminal state, NEWEST first — what the settings
 * panel offers to retry. Filtered in SQL, not in memory: "fetch 200 and filter"
 * would both miss older stuck batches and get slower as the log grows.
 */
export async function listUnfinishedBatches(limit: number): Promise<CaptureLogEntry[]> {
  const db = await getDb();
  return db
    .select(entryColumns)
    .from(messagingSessions)
    .where(ne(messagingSessions.status, "done"))
    .orderBy(desc(messagingSessions.createdAt), desc(messagingSessions.id))
    .limit(limit);
}

/** One forwarded message and the verdict the batch reached about it. */
export interface CaptureLogItem {
  id: string;
  seq: number;
  kind: string;
  payload: unknown;
  createdAt: Date;
  outcomeKind: MessagingItemOutcome | null;
  outcome: unknown;
}

/** Every message in ONE batch, in arrival order — the expanded row. Reads
 *  straight off the (session_id, seq) index. */
export async function listCaptureLogItems(sessionId: string): Promise<CaptureLogItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: messagingSessionItems.id,
      seq: messagingSessionItems.seq,
      kind: messagingSessionItems.kind,
      payload: messagingSessionItems.payload,
      createdAt: messagingSessionItems.createdAt,
      outcomeKind: messagingSessionItems.outcomeKind,
      outcome: messagingSessionItems.outcome,
    })
    .from(messagingSessionItems)
    .where(eq(messagingSessionItems.sessionId, sessionId))
    .orderBy(messagingSessionItems.seq);
  return rows.map((row) => ({
    ...row,
    outcomeKind: (row.outcomeKind as MessagingItemOutcome | null) ?? null,
  }));
}
