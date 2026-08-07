/**
 * AI credits — the user-facing unit of cloud-AI usage. Pure data plus one
 * lookup (no I/O), shared by the app's metering and the hosted admin/billing
 * views. See ./table for how every price was derived and which are measured
 * versus estimated.
 *
 * Split into a directory only to keep each file under the repo's 150-line rule;
 * the import specifier `@dhaga/core/src/metering/credits` is unchanged.
 */
import { AI_ACTION_CREDITS } from "./table";
import type { AiActionFeature } from "./features";

export { AI_ACTION_FEATURES, type AiActionFeature } from "./features";
export { AI_ACTION_CREDITS } from "./table";

/**
 * Credits for an action feature read back from storage. History rows predate
 * some of these names, and a self-hoster can end up with a feature this build
 * has never heard of — an unknown action costs the 1-credit floor rather than
 * silently costing nothing.
 */
export function creditsForAiAction(feature: string): number {
  return AI_ACTION_CREDITS[feature as AiActionFeature] ?? 1;
}
