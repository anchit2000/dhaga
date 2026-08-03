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
  /* No `goal_resolve` bucket. Resolving a goal's cohort on demand
   * (lib/ai/goal-resolve) once had a 3-a-day fuse purely because it was priced
   * at 0 credits and nothing bounded it. It is now its own priced feature
   * (`goal_match_now`), so the monthly credit allowance is the fuse, the `ai`
   * burst guard above still stops rapid-fire clicking, and the dollar ceiling
   * backstops unlimited-credit plans. A second day-long refusal on top of a
   * price the user knowingly paid would only take away credits they own. */
  /** External AI clients over MCP (/api/mcp). An agent loop issues tool calls
   *  far faster than a person clicks and will happily retry a tool it didn't
   *  like, so this is a tenant-pool guard (max 3 connections) as much as an
   *  abuse guard — roomy enough for the several calls one research turn makes. */
  mcp: { points: 60, durationSec: 60 },
  /** In-app feedback (/api/feedback). Every point is a hand-typed report plus an
   *  owner email, so the natural rate is a couple per session — this only stops
   *  a stuck submit button (or a script) from flooding that inbox. Its own
   *  bucket rather than sharing `capture`: a feedback flood must never eat the
   *  budget the extension and mobile share sheet depend on. */
  feedback: { points: 5, durationSec: 300 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;
