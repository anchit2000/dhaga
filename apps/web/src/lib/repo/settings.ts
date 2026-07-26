import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { settings } from "@/lib/db/schema";
import { parseSearchWeights, type SearchWeights } from "@/utils/constants/search";

export const STORE_CARD_PHOTOS_KEY = "store_card_photos";
export const SIGNAL_DETECTION_BATCH_KEY = "signal_detection_pending_batch";
export const SEARCH_WEIGHTS_KEY = "search_weights";
export const ONBOARDING_TOUR_KEY = "onboarding_tour_seen";
/** Per-user monthly cloud-AI action allowance ("credits") an admin can grant. */
export const AI_MONTHLY_CAP_OVERRIDE_KEY = "ai_monthly_cap_override";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  // Raw SQL, not Drizzle's onConflictDoUpdate({ target: settings.key }):
  // this table's actual primary key differs by mode — plain (key) when
  // self-hosted, composite (user_id, key) under EE's per-tenant RLS (see
  // packages/ee/src/db/rls-ddl.ts) — but Postgres always names a table's
  // primary key constraint "<table>_pkey" regardless of its columns, so
  // conflict-by-constraint-name resolves correctly in both without this
  // function ever needing to know which mode is active.
  await db.execute(sql`
    insert into settings (key, value, updated_at)
    values (${key}, ${value}, now())
    on conflict on constraint settings_pkey
    do update set value = excluded.value, updated_at = excluded.updated_at
  `);
}

/**
 * Atomically append `value` to a JSON-array setting, deduping — in ONE
 * lock-free upsert. Two concurrent appends can't lose an update the way a
 * read-modify-write (getSetting → push → setSetting) can, and the single
 * statement also covers the first append when no row exists yet (the SELECT ...
 * FOR UPDATE approach can't lock a row that isn't there). On insert the value
 * becomes a one-element array; on conflict we union the existing array with the
 * incoming one and keep only DISTINCT elements. Conflict-by-constraint-name for
 * the same self-host/EE reason setSetting documents above.
 */
export async function appendToSettingArray(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into settings (key, value, updated_at)
    values (${key}, to_jsonb(array[${value}]::text[])::text, now())
    on conflict on constraint settings_pkey
    do update set
      value = (
        select jsonb_agg(distinct e)::text
        from jsonb_array_elements_text(
          coalesce(settings.value, '[]')::jsonb || excluded.value::jsonb
        ) as e
      ),
      updated_at = now()
  `);
}

/** Whether scanned card photos are kept as visual receipts (default: yes). */
export async function shouldStoreCardPhotos(): Promise<boolean> {
  return (await getSetting(STORE_CARD_PHOTOS_KEY)) !== "off";
}

export async function setStoreCardPhotos(enabled: boolean): Promise<void> {
  await setSetting(STORE_CARD_PHOTOS_KEY, enabled ? "on" : "off");
}

/**
 * The one Anthropic Message Batch the nightly signal-detection job has in
 * flight, if any — cross-invocation state so the next cron run can pick up
 * where the last one left off (batches are asynchronous, up to 24h; a
 * single ~300s Vercel Function can't wait for one). Reuses this key/value
 * table rather than a new one: it's a single id, nothing relational about
 * it (CLAUDE.md Rule 2 — boring storage, no new abstraction for one string).
 */
export async function getPendingSignalBatchId(): Promise<string | null> {
  const value = await getSetting(SIGNAL_DETECTION_BATCH_KEY);
  return value ? value : null;
}

export async function setPendingSignalBatchId(batchId: string | null): Promise<void> {
  await setSetting(SIGNAL_DETECTION_BATCH_KEY, batchId ?? "");
}

/** User-tuned hybridSearch scoring weights (Search tab's "Tune ranking" panel). */
export async function getSearchWeights(): Promise<SearchWeights> {
  return parseSearchWeights(await getSetting(SEARCH_WEIGHTS_KEY));
}

export async function setSearchWeights(weights: SearchWeights): Promise<void> {
  await setSetting(SEARCH_WEIGHTS_KEY, JSON.stringify(weights));
}

/** Whether the first-run product walkthrough has already run for this user. */
export async function hasSeenOnboardingTour(): Promise<boolean> {
  return (await getSetting(ONBOARDING_TOUR_KEY)) === "yes";
}

export async function setOnboardingTourSeen(): Promise<void> {
  await setSetting(ONBOARDING_TOUR_KEY, "yes");
}
