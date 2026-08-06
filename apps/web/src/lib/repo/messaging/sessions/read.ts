import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems, type MessagingSessionItemRow } from "@/lib/db/schema";

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

/** All items in a batch, in arrival order. */
export async function listSessionItems(sessionId: string): Promise<MessagingSessionItemRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(messagingSessionItems)
    .where(eq(messagingSessionItems.sessionId, sessionId))
    .orderBy(asc(messagingSessionItems.seq));
}

/**
 * The items a batch still owes work on, in arrival order. This — not
 * listSessionItems — is what the walk consumes, so re-driving a batch that was
 * killed mid-flight resumes instead of re-creating every contact and note it
 * already wrote.
 */
export async function listUnprocessedSessionItems(
  sessionId: string,
): Promise<MessagingSessionItemRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(messagingSessionItems)
    .where(
      and(eq(messagingSessionItems.sessionId, sessionId), isNull(messagingSessionItems.processedAt)),
    )
    .orderBy(asc(messagingSessionItems.seq));
}

/** A batch the sweeper can claim, identified by everything needed to route it. */
export interface SweepableSession {
  id: string;
  provider: string;
  externalId: string;
}

const SWEEP_COLUMNS = {
  id: messagingSessions.id,
  provider: messagingSessions.provider,
  externalId: messagingSessions.externalId,
};

/** Open batches with no activity since `idleBefore` — the idle sweeper's input. */
export async function findIdleOpenSessions(idleBefore: Date): Promise<SweepableSession[]> {
  const db = await getDb();
  return db
    .select(SWEEP_COLUMNS)
    .from(messagingSessions)
    .where(and(eq(messagingSessions.status, "open"), lt(messagingSessions.lastItemAt, idleBefore)));
}

/**
 * Batches STUCK in `processing` since before `stalledBefore` — a flush that was
 * killed mid-walk (the background `after()` outliving its function, a crash, a
 * deploy). Nothing else would ever pick these up: the idle sweep only looks for
 * `open`, so before this existed a stranded batch was lost silently, with the
 * sender already told it was being saved. Safe to re-drive because the walk
 * resumes from unprocessed items only (see listUnprocessedSessionItems).
 */
export async function findStalledProcessingSessions(
  stalledBefore: Date,
): Promise<SweepableSession[]> {
  const db = await getDb();
  return db
    .select(SWEEP_COLUMNS)
    .from(messagingSessions)
    .where(
      and(
        eq(messagingSessions.status, "processing"),
        lt(messagingSessions.updatedAt, stalledBefore),
      ),
    );
}
