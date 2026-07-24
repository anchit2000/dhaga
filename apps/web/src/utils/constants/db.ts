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
 *  saturated pool — a fast, clear failure beats a silent stall. Kept short so a
 *  doomed acquire fails fast rather than pinning a request for ~10s per retry. */
export const DB_POOL_CONNECTION_TIMEOUT_MS = 3_000;

/** Close idle backends quickly so a warm instance stops hoarding the shared 15. */
export const DB_POOL_IDLE_TIMEOUT_MS = 2_000;

/**
 * Transient-rejection retry (see lib/db/connect-retry.ts). When several warm
 * instances briefly overshoot the shared pool_size of 15, Supavisor rejects a
 * new backend with EMAXCONNSESSION / "max clients reached" — but a slot frees
 * within ms, so a short backoff-and-retry clears it. Retry is the graceful
 * lever; raising Supabase's pool_size is the durable one (docs/SCALING.md).
 * Both maxes are env-overridable (DB_CONNECT_RETRY_MAX / DB_CONNECT_RETRY_BASE_MS).
 */
/** Max acquisition attempts (incl. the first); override with DB_CONNECT_RETRY_MAX. */
export const DB_CONNECT_RETRY_MAX_DEFAULT = 3;
/** First backoff step in ms (doubles each retry); override with DB_CONNECT_RETRY_BASE_MS. */
export const DB_CONNECT_RETRY_BASE_MS_DEFAULT = 100;

/**
 * Parse a positive-integer pool size from an env var, falling back to the
 * default on missing/NaN/non-positive input (same defensive shape as
 * monthlyAiCap() in lib/ai/metering.ts). Also reused for the retry counts above.
 */
export function poolMaxFromEnv(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * True ONLY for the transient session-pool rejections a retry can clear (a slot
 * frees on its own within ms): Supavisor's `XX000 … max clients reached in
 * session mode` (some drivers surface it as code `EMAXCONNSESSION`), and
 * node-postgres' own `timeout exceeded when trying to connect`. Everything else
 * (auth failure, bad SQL, a real network drop) is NOT transient and returns
 * false so it fails loud on the first attempt.
 *
 * Duplicated (not imported) from packages/ee/src/db/connect-retry.ts on purpose:
 * this file is AGPL core and must build with packages/ee deleted, so it can
 * never import from @dhaga/ee. Keep the two copies in sync.
 */
export function isTransientConnectionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message : "";
  if (code === "EMAXCONNSESSION") return true;
  if (code === "XX000" && /max clients reached/i.test(text)) return true;
  return /timeout exceeded when trying to connect/i.test(text);
}
