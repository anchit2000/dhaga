// Dhaga Cloud only — see packages/ee/LICENSE.
import { AI_ACTION_LABELS, UNKNOWN_AI_ACTION_LABEL } from "@/utils/constants/ai-credits";

/** Plural, human name for a stored `ai_actions.feature` id — the admin screen
 *  reads "Watchlist scans", never "signal_detection", for the same reason the
 *  user-facing credits page does. */
export function labelForFeature(feature: string): string {
  return (
    AI_ACTION_LABELS[feature as keyof typeof AI_ACTION_LABELS] ?? UNKNOWN_AI_ACTION_LABEL
  ).many;
}

/** Cost figures here run from cents to fractions of a cent, so a fixed
 *  precision either hides real money or drowns the page in zeroes. */
export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
