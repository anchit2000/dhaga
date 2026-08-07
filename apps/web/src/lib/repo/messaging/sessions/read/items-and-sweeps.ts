import { and, asc, eq, isNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingSessions, messagingSessionItems, type MessagingSessionItemRow } from "@/lib/db/schema";

/**
 * Reads over the capture batches (messaging_sessions / messaging_session_items).
 * TENANT-scoped: every function here is only ever called INSIDE a
 * withUserDb(userId) scope and relies on EE's RLS (or the self-host single-user
 * default) for ownership, so none takes a userId. NEVER log the forwarded
 * payload (third-party PII).
 */


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
