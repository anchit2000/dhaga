import { MemoryRateLimiter } from "./memory";
import type { RateLimiter } from "./types";
import type { RateLimitBucket } from "@/utils/constants/ratelimit";

export type { RateLimiter, RateLimitResult } from "./types";

let singleton: RateLimiter | undefined;

/**
 * The process-wide rate limiter. Backend is chosen by `RATE_LIMIT_BACKEND`
 * (default "memory"); "postgres"/"redis" are the pluggable future stores in
 * docs/LIBRARIES.md §9 — adding one is a new `RateLimiter` impl plus a case
 * here, with zero changes to call sites (same shape as the LLM/Search gateways).
 */
export function getRateLimiter(): RateLimiter {
  if (singleton) return singleton;
  const backend = process.env.RATE_LIMIT_BACKEND ?? "memory";
  switch (backend) {
    case "memory":
      singleton = new MemoryRateLimiter();
      return singleton;
    default:
      throw new Error(
        `Unsupported RATE_LIMIT_BACKEND "${backend}" — only "memory" is implemented (see docs/LIBRARIES.md §9).`,
      );
  }
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Too many requests — slow down and try again in a moment.");
    this.name = "RateLimitError";
  }
}

/** Consume one point for `key` (usually a userId) in `bucket`; throws
 *  RateLimitError when the bucket is exhausted. */
export async function enforceRateLimit(key: string, bucket: RateLimitBucket): Promise<void> {
  const { allowed, retryAfterMs } = await getRateLimiter().consume(key, bucket);
  if (!allowed) throw new RateLimitError(retryAfterMs);
}
