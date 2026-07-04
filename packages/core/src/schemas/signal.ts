import { z } from "zod";

/**
 * Proactive-intelligence signal (BRD §5.2 v1.2, §6.7): job-change detection
 * and the news watchlist share one classification shape — both ask "does
 * this web search reveal a notable update about a specific contact?" — so
 * one schema and one detection job serve both checklist items.
 */

export const SIGNAL_KINDS = ["job_change", "news"] as const;

export const signalDetectionSchema = z.object({
  hasSignal: z
    .boolean()
    .describe(
      "True only if the search results contain a genuine, notable update about this specific person",
    ),
  kind: z
    .enum(SIGNAL_KINDS)
    .nullable()
    .describe(
      "job_change if their role/company changed from what's on file; news for other notable public activity; null if hasSignal is false",
    ),
  headline: z
    .string()
    .describe("One short sentence summarizing the update; empty string if hasSignal is false"),
  detail: z
    .string()
    .describe(
      "1-3 sentences of supporting detail drawn only from the search results; empty string if hasSignal is false",
    ),
  sourceUrl: z
    .string()
    .nullable()
    .describe("The URL of the search result this was drawn from, or null"),
});

export type SignalDetection = z.infer<typeof signalDetectionSchema>;
export type SignalKind = (typeof SIGNAL_KINDS)[number];
