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
  /** Bulk contact import (OAuth provider fetch, mobile /api/import). One call
   *  pulls/sends a whole batch, so a modest window is plenty. */
  import: { points: 12, durationSec: 60 },
  /** Taught dictation vocabulary CRUD (/api/voice/vocab). User-driven and
   *  low-frequency, but a session start re-reads it, so keep the window roomy. */
  voice_vocab: { points: 60, durationSec: 60 },
  /** Reads against a connected calendar's API (full event reads, write-out).
   *  Every point is an outbound Google/Microsoft call on the user's quota, so
   *  this guards THEIR quota as much as ours — roomy enough for normal browsing
   *  of /app/calendar, tight enough that a reload loop can't burn the grant. */
  calendar_external: { points: 30, durationSec: 60 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;
