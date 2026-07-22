import type { RateLimitBucket } from "@/utils/constants/ratelimit";

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the key may retry; 0 when allowed. */
  retryAfterMs: number;
}

/**
 * Provider-agnostic rate-limiter contract (same dependency-inversion shape as
 * LLMClient / SearchClient). Implementations back it with different stores —
 * Memory today, Postgres/Redis later — selected by `getRateLimiter()`, so call
 * sites never change when the store does (docs/LIBRARIES.md §9).
 */
export interface RateLimiter {
  /** Consume one point for `key` (usually a userId) in `bucket`. */
  consume(key: string, bucket: RateLimitBucket): Promise<RateLimitResult>;
}
