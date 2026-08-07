import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems } from "@/lib/db/schema";

/**
 * Reads over the capture batches (messaging_sessions / messaging_session_items).
 * TENANT-scoped: every function here is only ever called INSIDE a
 * withUserDb(userId) scope and relies on EE's RLS (or the self-host single-user
 * default) for ownership, so none takes a userId. NEVER log the forwarded
 * payload (third-party PII).
 */
/** The open batch for a sender (with its item count + last activity), or null. */
export async function getOpenSession(input: {
  provider: string;
  externalId: string;
}): Promise<{ id: string; itemCount: number; lastItemAt: Date } | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: messagingSessions.id,
      lastItemAt: messagingSessions.lastItemAt,
      // LEFT JOIN + count, NOT a correlated `sql` subquery. Interpolating a
      // column into a raw sql template emits it UNQUALIFIED (`"id"`), and inside
      // a subquery over messaging_session_items that binds to THAT table's own
      // id — `session_id = id`, never true — so the count silently read 0 for
      // every batch. Postgres can't catch it: both tables have an `id`.
      itemCount: sql<number>`count(${messagingSessionItems.id})::int`,
    })
    .from(messagingSessions)
    .leftJoin(messagingSessionItems, eq(messagingSessionItems.sessionId, messagingSessions.id))
    .where(
      and(
        eq(messagingSessions.provider, input.provider),
        eq(messagingSessions.externalId, input.externalId),
        eq(messagingSessions.status, "open"),
      ),
    )
    .groupBy(messagingSessions.id, messagingSessions.lastItemAt, messagingSessions.createdAt)
    .orderBy(desc(messagingSessions.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * The batch a DONE should re-drive: the sender's open batch, or — when there
 * isn't one — their most recent FAILED batch.
 *
 * Without the failed case a failed batch was stranded forever. `getOpenSession`
 * matches only `open`, and the flush sweeper claims only idle-`open` and
 * stalled-`processing` batches, so nothing in the system could ever pick a
 * `failed` one up again — while the bot's own reply told the sender to "reply
 * DONE to try again". The items were all still there, unprocessed and intact;
 * there was simply no path back to them.
 *
 * Deliberately only when NO open batch exists: a sender who has moved on and
 * started forwarding again means DONE to close the NEW batch, not to resurrect
 * last week's failure. The old one stays in the capture log to be retried from
 * there.
 */
export async function getRetriableSession(input: {
  provider: string;
  externalId: string;
}): Promise<{ id: string; itemCount: number; lastItemAt: Date } | null> {
  const open = await getOpenSession(input);
  if (open) return open;
  const db = await getDb();
  const [row] = await db
    .select({
      id: messagingSessions.id,
      lastItemAt: messagingSessions.lastItemAt,
      itemCount: sql<number>`count(${messagingSessionItems.id})::int`,
    })
    .from(messagingSessions)
    .leftJoin(messagingSessionItems, eq(messagingSessionItems.sessionId, messagingSessions.id))
    .where(
      and(
        eq(messagingSessions.provider, input.provider),
        eq(messagingSessions.externalId, input.externalId),
        eq(messagingSessions.status, "failed"),
      ),
    )
    .groupBy(messagingSessions.id, messagingSessions.lastItemAt, messagingSessions.createdAt)
    .orderBy(desc(messagingSessions.createdAt))
    .limit(1);
  return row ?? null;
}

