import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { signals, type SignalRow } from "@/lib/db/schema";

/**
 * True when this contact already has an unactioned signal of this kind.
 * Nothing updates `contacts.title`/`companyId` when a job-change signal
 * fires (converting to a note is an explicit, receipted user action, not an
 * automatic graph write) — so an unresolved change looks identical to the
 * detection job on every rescan. Without this guard, the nightly sweep would
 * re-insert a fresh "new" row for the same still-open change every ~6 days
 * for as long as the user leaves it unactioned, flooding the Home feed with
 * duplicates of one event instead of the one alert it actually is.
 */
export async function hasOpenSignal(contactId: string, kind: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: signals.id })
    .from(signals)
    .where(
      and(eq(signals.contactId, contactId), eq(signals.kind, kind), eq(signals.status, "new")),
    )
    .limit(1);
  return Boolean(row);
}

export async function dismissSignal(signalId: string): Promise<void> {
  const db = await getDb();
  await db.update(signals).set({ status: "dismissed" }).where(eq(signals.id, signalId));
}

export async function markSignalNoted(signalId: string): Promise<void> {
  const db = await getDb();
  await db.update(signals).set({ status: "noted" }).where(eq(signals.id, signalId));
}

/**
 * Atomically CLAIM a signal for "add as note", returning the claimed row or
 * null if it was already noted (or is gone). The `status <> 'noted'` predicate
 * lives in the UPDATE itself, so the flip-to-noted and the not-yet-noted check
 * are one indivisible statement: a double-clicked second submission finds the
 * row locked, then re-evaluates the predicate against the winner's committed
 * `noted` status and matches nothing — so only the first submission proceeds to
 * create a note/facts/edges (idempotency guard, #13). Returning the full row
 * lets the caller build the note body without a separate read.
 */
export async function claimSignalForNote(signalId: string): Promise<SignalRow | null> {
  const db = await getDb();
  const [row] = await db
    .update(signals)
    .set({ status: "noted" })
    .where(and(eq(signals.id, signalId), ne(signals.status, "noted")))
    .returning();
  return row ?? null;
}
