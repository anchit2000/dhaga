/**
 * Connection-pool sizing for hosted Postgres (Supabase session pooler,
 * port 5432 — see the boot guard in packages/ee/src/db/bootstrap.ts).
 *
 * The session pooler exposes a FIXED pool_size of 15 backends shared across
 * EVERY warm Vercel instance. Each instance opens this core pool AND, in
 * hosted mode, a separate EE tenant pool (packages/ee/src/db/pool.ts). So the
 * real per-instance draw is (core max + tenant max), and several instances can
 * be warm at once. Keep the sum small enough that a handful of instances still
 * fit under 15 — the defaults below give 2 + 3 = 5/instance, leaving headroom
 * for ~3 warm instances. Do NOT raise these blindly: one instance hoarding all
 * 15 slots is exactly the EMAXCONNSESSION outage this guards against.
 *
 * Both maxes are env-overridable (DB_POOL_MAX_CORE / DB_POOL_MAX_TENANT) so
 * they can be tuned from Vercel without a redeploy.
 */

/** Default max connections for the core pool; override with DB_POOL_MAX_CORE. */
export const DB_POOL_MAX_CORE_DEFAULT = 2;

/** Reject a connection request after this long instead of hanging forever on a
 *  saturated pool — a fast, clear failure beats a silent stall. */
export const DB_POOL_CONNECTION_TIMEOUT_MS = 10_000;

/** Close idle backends quickly so a warm instance stops hoarding the shared 15. */
export const DB_POOL_IDLE_TIMEOUT_MS = 10_000;

/**
 * Parse a positive-integer pool size from an env var, falling back to the
 * default on missing/NaN/non-positive input (same defensive shape as
 * monthlyAiCap() in lib/ai/metering.ts).
 */
export function poolMaxFromEnv(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
