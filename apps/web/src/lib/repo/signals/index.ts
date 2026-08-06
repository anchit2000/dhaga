// Split per the 150-line rule; import paths unchanged (@/lib/repo/signals).
/**
 * Watchlist + signals (BRD §5.2 v1.2, §6.7): opt-in per-contact job-change
 * and news detection. Gated behind the same `enrichment` plan feature as
 * web-search enrichment — BRD's FEATURE_LABELS groups them as one capability.
 */
export { countWatched, toggleWatch, type ToggleWatchResult } from "./watchlist";
export { listNewSignals, listContactSignals, getSignal, type SignalItem } from "./queries";
export {
  hasOpenSignal,
  dismissSignal,
  markSignalNoted,
  claimSignalForNote,
} from "./mutations";
