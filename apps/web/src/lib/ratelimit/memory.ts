import { RateLimiterMemory } from "rate-limiter-flexible";
import { RATE_LIMITS, type RateLimitBucket } from "@/utils/constants/ratelimit";
import type { RateLimiter, RateLimitResult } from "./types";

/**
 * In-memory limiter (rate-limiter-flexible's `RateLimiterMemory`). State lives
 * in this process, so on serverless it is per-instance — limits are approximate
 * across a fleet. That is a solid first guard and exact for single-node
 * self-host; swap to the Postgres/Redis store for exact distributed limiting
 * (a new RateLimiter impl + a case in `getRateLimiter()` — docs/LIBRARIES.md §9).
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly limiters: Record<RateLimitBucket, RateLimiterMemory>;

  constructor() {
    const limiters = {} as Record<RateLimitBucket, RateLimiterMemory>;
    for (const bucket of Object.keys(RATE_LIMITS) as RateLimitBucket[]) {
      const { points, durationSec } = RATE_LIMITS[bucket];
      limiters[bucket] = new RateLimiterMemory({ keyPrefix: bucket, points, duration: durationSec });
    }
    this.limiters = limiters;
  }

  async consume(key: string, bucket: RateLimitBucket): Promise<RateLimitResult> {
    try {
      await this.limiters[bucket].consume(key);
      return { allowed: true, retryAfterMs: 0 };
    } catch (rejection) {
      // rate-limiter-flexible *rejects* with a RateLimiterRes (carrying
      // msBeforeNext) when the limit is hit — not an Error. Anything without
      // that shape is a genuine failure and rethrows.
      if (rejection && typeof rejection === "object" && "msBeforeNext" in rejection) {
        return { allowed: false, retryAfterMs: Number((rejection as { msBeforeNext: number }).msBeforeNext) };
      }
      throw rejection;
    }
  }
}
