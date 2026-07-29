import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rate-limit";
import { normalizeLocationQuery } from "../normalize";

/** Short interval so the suite stays fast; the ToS value is 1000ms. */
const INTERVAL_MS = 60;
/** Date.now()/timer coarseness (Windows ticks ~15ms) — timers fire late, not early. */
const TOLERANCE_MS = 2;

describe("createRateLimiter", () => {
  /**
   * WHY: Nominatim's usage policy caps the public instance at 1 request per
   * second and blocks deployments that exceed it. A batch that loops over
   * every distinct contact location would breach that in milliseconds, so the
   * ceiling must hold no matter how callers fire work at it. If this test can
   * pass with the spacing removed, the gate isn't enforcing anything.
   */
  it("spaces concurrently-submitted work by at least the interval", async () => {
    const limit = createRateLimiter(INTERVAL_MS);
    const startedAt: number[] = [];
    const task = async (): Promise<void> => {
      startedAt.push(Date.now());
    };

    await Promise.all([limit(task), limit(task), limit(task)]);

    expect(startedAt).toHaveLength(3);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(INTERVAL_MS - TOLERANCE_MS);
    expect(startedAt[2] - startedAt[1]).toBeGreaterThanOrEqual(INTERVAL_MS - TOLERANCE_MS);
  });

  it("runs the first task immediately", async () => {
    const limit = createRateLimiter(INTERVAL_MS);
    const before = Date.now();
    await limit(async () => undefined);
    expect(Date.now() - before).toBeLessThan(INTERVAL_MS);
  });

  /** WHY: work must not overlap — two in-flight requests are two requests. */
  it("serializes work in submission order", async () => {
    const limit = createRateLimiter(1);
    const order: string[] = [];
    const task = (id: string) => async (): Promise<void> => {
      order.push(`start:${id}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`end:${id}`);
    };

    await Promise.all([limit(task("a")), limit(task("b"))]);

    expect(order).toEqual(["start:a", "end:a", "start:b", "end:b"]);
  });

  /**
   * WHY: geocoding fails transiently (timeouts, 5xx). If one rejection broke
   * the chain, the rate limiter would deadlock every later lookup — and the
   * obvious "fix" (dropping the gate) would breach the ToS.
   */
  it("keeps rate-limiting after a task rejects, and surfaces the rejection", async () => {
    const limit = createRateLimiter(INTERVAL_MS);
    const boom = limit(async () => {
      throw new Error("boom");
    });
    await expect(boom).rejects.toThrow("boom");

    const before = Date.now();
    await expect(limit(async () => "ok")).resolves.toBe("ok");
    expect(Date.now() - before).toBeGreaterThanOrEqual(INTERVAL_MS - TOLERANCE_MS);
  });
});

describe("normalizeLocationQuery", () => {
  /**
   * WHY: the cache key is the ONLY thing standing between us and re-querying
   * a public service for a place it already answered. Casing and typing style
   * must collapse to one key or every variant costs another request.
   */
  it("collapses case, padding, and comma/whitespace style to one key", () => {
    const key = normalizeLocationQuery("Bengaluru, India");
    expect(normalizeLocationQuery("  bengaluru,india ")).toBe(key);
    expect(normalizeLocationQuery("BENGALURU ,  India")).toBe(key);
    expect(normalizeLocationQuery("Bengaluru,\tIndia")).toBe(key);
  });

  it("returns an empty key for input with no usable content", () => {
    expect(normalizeLocationQuery("   ")).toBe("");
    expect(normalizeLocationQuery(" , ")).toBe("");
  });

  /**
   * WHY: over-normalizing is worse than under-normalizing — merging two
   * distinct places puts a contact on the wrong continent. Distinct places
   * must stay distinct keys.
   */
  it("keeps genuinely different places apart", () => {
    expect(normalizeLocationQuery("Springfield, IL")).not.toBe(normalizeLocationQuery("Springfield, MA"));
    expect(normalizeLocationQuery("London, UK")).not.toBe(normalizeLocationQuery("London, Ontario"));
  });
});
