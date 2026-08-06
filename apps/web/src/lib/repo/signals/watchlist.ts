import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { currentPlan, requireFeature } from "@/lib/entitlements";
import { FREE_TIER_WATCHLIST_CAP, PRO_TIER_WATCHLIST_CAP } from "@/utils/constants/app";

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
        error: "Watching for job changes and news requires a Pro or Lifetime plan.",
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
