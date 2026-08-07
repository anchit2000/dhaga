/**
 * Relationship decay + strength (BRD §5.2 v1.2, §6.7 — own-graph data only).
 * Both are computed at read time from touches already in the graph; no jobs.
 */
export const DECAY_AFTER_DAYS = 240; // ≈ 8 months — BRD's "no contact in 8 months"

/** Days for the recency half of the strength score to halve. */
export const STRENGTH_HALF_LIFE_DAYS = 90;
/** Interactions inside this window feed the frequency half of the score. */
export const STRENGTH_WINDOW_DAYS = 365;
/** Interactions per window at which frequency saturates (score-wise). */
export const STRENGTH_SATURATION = 10;
/** Recency vs frequency blend; must sum to 1. */
export const STRENGTH_RECENCY_WEIGHT = 0.6;

/** Score bands, highest first. */
export const STRENGTH_BANDS = [
  { min: 70, label: "Strong" },
  { min: 40, label: "Warm" },
  { min: 15, label: "Cooling" },
  { min: 0, label: "Dormant" },
] as const;
export type StrengthLabel = (typeof STRENGTH_BANDS)[number]["label"];

/** How many "going quiet" contacts the Home feed shows before "+N more". */
export const QUIET_FEED_LIMIT = 8;
