import { getSetting, setSetting } from "./kv";
import { parseSearchWeights, type SearchWeights } from "@/utils/constants/search";
import { parseUiTheme, serializeUiTheme, type UiTheme } from "@/utils/constants/theme";

export const STORE_CARD_PHOTOS_KEY = "store_card_photos";
export const SIGNAL_DETECTION_BATCH_KEY = "signal_detection_pending_batch";
export const PERSON_CLASSIFICATION_BATCH_KEY = "person_classification_pending_batch";
export const GOAL_MATCH_BATCH_KEY = "goal_match_pending_batch";
export const SEARCH_WEIGHTS_KEY = "search_weights";
export const ONBOARDING_TOUR_KEY = "onboarding_tour_seen";
export const UI_THEME_KEY = "ui_theme";
/** Per-user monthly cloud-AI action allowance ("credits") an admin can grant. */
export const AI_MONTHLY_CAP_OVERRIDE_KEY = "ai_monthly_cap_override";

// Import paths stay stable via this barrel: @/lib/repo/settings.
export {
  appendToSettingArray,
  getSetting,
  getSettings,
  seedSettings,
  setSetting,
} from "./kv";

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

/**
 * The same cross-invocation pointer for the other nightly Batch passes, keyed
 * generically so a new pass costs one constant rather than a copy of the two
 * accessors above (the signal pair keeps its named form — it has callers).
 *
 * Every job MUST use its OWN key. One shared pointer would serialize the passes:
 * whichever ran first parks its batch id there and every other pass then sees "a
 * batch is still in flight" and skips — a multi-night person-classification
 * backfill would stall goal resolution behind it indefinitely.
 *
 * The value is opaque here: a caller needing more than the batch id to resume
 * (match-goal carries the goal it judged against) encodes and parses that itself.
 */
export async function getPendingBatchId(key: string): Promise<string | null> {
  return (await getSetting(key)) || null;
}

export async function setPendingBatchId(key: string, value: string | null): Promise<void> {
  await setSetting(key, value ?? "");
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

/**
 * The user's /app palette + font choice. No DDL: it is one small JSON blob with
 * nothing relational about it, so it rides this key/value table like every other
 * preference (Rule 2). setSetting conflicts on the constraint NAME, so the write
 * behaves identically self-hosted (plain `key` PK) and under EE's per-tenant RLS
 * (composite `(user_id, key)` PK) — see the comment there.
 */
export async function getUiTheme(): Promise<UiTheme> {
  return parseUiTheme(await getSetting(UI_THEME_KEY));
}

export async function setUiTheme(theme: UiTheme): Promise<void> {
  await setSetting(UI_THEME_KEY, serializeUiTheme(theme));
}
