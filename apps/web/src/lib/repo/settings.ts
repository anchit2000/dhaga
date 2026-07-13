import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { settings } from "@/lib/db/schema";
import { parseSearchWeights, type SearchWeights } from "@/utils/constants/search";

export const STORE_CARD_PHOTOS_KEY = "store_card_photos";
export const SIGNAL_DETECTION_BATCH_KEY = "signal_detection_pending_batch";
export const SEARCH_WEIGHTS_KEY = "search_weights";
export const STT_ENGINE_KEY = "stt_engine";

export type SttEngine = "browser" | "local";

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
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
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

/**
 * Voice dictation engine: "browser" (Web Speech API — free, but unsupported
 * on Firefox and silently broken on Brave/vanilla Chromium, which block the
 * network call it depends on) or "local" (on-device Whisper via
 * transformers.js — works everywhere, first use downloads the model).
 */
export async function getSttEngine(): Promise<SttEngine> {
  const value = await getSetting(STT_ENGINE_KEY);
  return value === "local" ? "local" : "browser";
}

export async function setSttEngine(engine: SttEngine): Promise<void> {
  await setSetting(STT_ENGINE_KEY, engine);
}
