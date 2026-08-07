import { withUserDb } from "@/lib/db/request-scope";
import { applyWritePlan } from "./apply";
import {
  loadWritePlan,
  openFollowUpIdsForNote,
  persistWriteOutcomes,
} from "./db";
import { orphanedCalendarFollowUpIds } from "./orphans";

export type { WriteOutcome, WritePlan, WriteTarget } from "./types";

/**
 * Mirror one follow-up onto every connected calendar that is upgraded AND has
 * write-out switched on. Idempotent and safe to call after any follow-up
 * change: create, edit, reschedule, complete, dismiss. Completing or dismissing
 * makes the mapper return no event, which deletes what we wrote — a resolved
 * follow-up never lingers on the user's calendar.
 *
 * Three strictly separated phases so a tenant connection is NEVER held across
 * an HTTP call (the pool-exhaustion bug this codebase keeps re-shipping):
 *   1. loadWritePlan     — DB only, one scoped connection, then released
 *   2. applyWritePlan    — network only, zero connections checked out
 *   3. persistWriteOutcomes — DB only, one scoped connection
 * A user with no upgraded, write-enabled connection costs exactly one cheap
 * read and stops at phase 1.
 */
export async function syncFollowUpToCalendars(
  userId: string,
  followUpId: string,
): Promise<void> {
  const plan = await withUserDb(userId, () => loadWritePlan(followUpId));
  if (plan.targets.length === 0) return;
  const outcomes = await applyWritePlan(plan);
  await withUserDb(userId, () => persistWriteOutcomes(followUpId, outcomes));
}

/**
 * Reconcile hard-deleted tasks from their durable calendar link receipts.
 * The caller has already committed its DB transaction; each sync keeps the
 * existing DB -> network -> DB phase separation intact.
 */
export async function syncDeletedFollowUpsToCalendars(
  userId: string,
  followUpIds: string[] = [],
): Promise<void> {
  const orphaned = await withUserDb(userId, orphanedCalendarFollowUpIds);
  const ids = [...new Set([...followUpIds, ...orphaned])];
  for (const followUpId of ids) await syncFollowUpToCalendars(userId, followUpId);
}

/**
 * Mirror the follow-ups a note's extraction just created. Most follow-ups are
 * born here rather than typed by hand, so without this the calendar would only
 * ever show the manual ones. Sequential — each follow-up opens and closes its
 * own short scope, so a note with several never holds more than one connection.
 */
export async function syncNoteFollowUpsToCalendars(
  userId: string,
  noteId: string,
): Promise<void> {
  await syncDeletedFollowUpsToCalendars(userId);
  const followUpIds = await withUserDb(userId, () => openFollowUpIdsForNote(noteId));
  for (const followUpId of followUpIds) {
    await syncFollowUpToCalendars(userId, followUpId);
  }
}
