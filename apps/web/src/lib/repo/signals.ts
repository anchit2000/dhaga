import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, signals, type SignalRow } from "@/lib/db/schema";
import { currentPlan, requireFeature } from "@/lib/entitlements";
import { FREE_TIER_WATCHLIST_CAP, PRO_TIER_WATCHLIST_CAP } from "@/utils/constants/app";

/**
 * Watchlist + signals (BRD §5.2 v1.2, §6.7): opt-in per-contact job-change
 * and news detection. Gated behind the same `enrichment` plan feature as
 * web-search enrichment — BRD's FEATURE_LABELS groups them as one capability.
 */

async function watchlistCap(userId: string): Promise<number> {
  const plan = await currentPlan(userId);
  return plan === "free" ? FREE_TIER_WATCHLIST_CAP : PRO_TIER_WATCHLIST_CAP;
}

export async function countWatched(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.watchedForSignals, true));
  return rows.length;
}

export interface ToggleWatchResult {
  ok: boolean;
  error?: string;
}

export async function toggleWatch(
  userId: string,
  contactId: string,
  watch: boolean,
): Promise<ToggleWatchResult> {
  if (watch) {
    try {
      await requireFeature(userId, "enrichment");
    } catch {
      return {
        ok: false,
        error: "Watching for job changes and news requires a Pro or Power plan.",
      };
    }
    const cap = await watchlistCap(userId);
    if ((await countWatched()) >= cap) {
      return { ok: false, error: `You can watch up to ${cap} contacts at a time.` };
    }
  }
  const db = await getDb();
  await db
    .update(contacts)
    .set({ watchedForSignals: watch, signalsScannedAt: watch ? null : undefined })
    .where(eq(contacts.id, contactId));
  return { ok: true };
}

export interface SignalItem {
  id: string;
  contactId: string;
  contactName: string;
  companyName: string | null;
  kind: string;
  headline: string;
  detail: string;
  sourceUrl: string | null;
  createdAt: Date;
}

/** All new (undismissed, unconverted) signals across the graph, for Home. */
export async function listNewSignals(): Promise<SignalItem[]> {
  const db = await getDb();
  return db
    .select({
      id: signals.id,
      contactId: signals.contactId,
      contactName: contacts.name,
      companyName: companies.name,
      kind: signals.kind,
      headline: signals.headline,
      detail: signals.detail,
      sourceUrl: signals.sourceUrl,
      createdAt: signals.createdAt,
    })
    .from(signals)
    .innerJoin(contacts, eq(contacts.id, signals.contactId))
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(eq(signals.status, "new"))
    .orderBy(desc(signals.createdAt));
}

export async function listContactSignals(contactId: string): Promise<SignalRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(signals)
    .where(and(eq(signals.contactId, contactId), eq(signals.status, "new")))
    .orderBy(desc(signals.createdAt));
}

export async function getSignal(signalId: string): Promise<SignalRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(signals).where(eq(signals.id, signalId)).limit(1);
  return row ?? null;
}

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
