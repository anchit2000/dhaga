/**
 * Per-user request rate limits (SCALING.md lever 5). Points = allowed requests
 * per `durationSec` window, keyed per user. These are burst guards that protect
 * the DB and AI cost from runaway load — distinct from the monthly AI-action
 * cap (`monthlyAiCap`), which is a billing quota, not an abuse guard.
 */
export const RATE_LIMITS = {
  /** External capture surface (extension, mobile share) — abuse-prone. */
  capture: { points: 30, durationSec: 60 },
  /** Burst guard on top of the monthly cap: blocks rapid-fire AI calls. */
  ai: { points: 20, durationSec: 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;
