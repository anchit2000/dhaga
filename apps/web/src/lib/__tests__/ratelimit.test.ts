import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/ratelimit/memory";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { RATE_LIMITS } from "@/utils/constants/ratelimit";

/**
 * The burst guard (SCALING.md lever 5) protects the DB and AI cost from
 * runaway load. These assert the properties that make it a guard, not just a
 * counter — otherwise a broken limiter would silently pass anything through.
 */
describe("MemoryRateLimiter", () => {
  it("allows exactly `points` requests per key, then blocks with a retry hint", async () => {
    const limiter = new MemoryRateLimiter();
    const { points } = RATE_LIMITS.capture;
    const key = "burst-key";

    for (let i = 0; i < points; i++) {
      // WHY: legitimate bursts up to the quota must never be blocked, or a
      // flurry of extension/mobile captures would fail for honest users.
      expect((await limiter.consume(key, "capture")).allowed).toBe(true);
    }

    const blocked = await limiter.consume(key, "capture");
    // WHY: the (points+1)th call in the window is the abuse case — it must be
    // denied AND report how long to back off (drives the 429 Retry-After).
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates keys — one user hitting the limit never blocks another", async () => {
    const limiter = new MemoryRateLimiter();
    const { points } = RATE_LIMITS.capture;
    for (let i = 0; i <= points; i++) await limiter.consume("noisy-user", "capture");

    // WHY: limits are per-user; a single noisy user denying service to everyone
    // sharing the process would be a cross-tenant availability bug.
    expect((await limiter.consume("quiet-user", "capture")).allowed).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  it("throws RateLimitError once the bucket is exhausted", async () => {
    const key = "enforce-key";
    const { points } = RATE_LIMITS.ai;
    for (let i = 0; i < points; i++) await enforceRateLimit(key, "ai");

    // WHY: call sites rely on the throw to short-circuit before the expensive
    // work (the AI call / DB write) runs — a silent pass would defeat the guard.
    await expect(enforceRateLimit(key, "ai")).rejects.toBeInstanceOf(RateLimitError);
  });
});
