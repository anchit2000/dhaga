import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

/**
 * The short mono tag that prefixes a row's reason. Keyed off the bucket union, so
 * a new SuggestionBucket cannot ship without a name for it — that is the point of
 * the Record: TypeScript fails the build rather than rendering `undefined ·`.
 */
export const BUCKET_LABEL: Record<DailySuggestion["bucket"], string> = {
  daily: "Check-in",
  cadence: "Due",
  "follow-up": "Follow-up",
  date: "Occasion",
  goal: "Goal",
  signal: "Signal",
  quiet: "Quiet",
  graph: "Network",
};
