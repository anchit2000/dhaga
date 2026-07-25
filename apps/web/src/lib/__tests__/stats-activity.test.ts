import { describe, expect, it } from "vitest";
import { getGraphActivity } from "@/lib/repo/stats";

/**
 * The StatStrip sparkline query is raw SQL (make_interval / extract(epoch) /
 * weeks-ago bucketing) that tsc can't check — a broken query would throw and
 * blank the whole StatStrip region on Home. This asserts it runs on Postgres and
 * always returns a fixed 8-week series per metric, zero-padded.
 */
describe("getGraphActivity", () => {
  it("returns an 8-length, non-negative weekly series for every metric", async () => {
    const activity = await getGraphActivity();
    const series = Object.values(activity) as number[][];
    expect(series).toHaveLength(8); // eight metrics
    for (const points of series) {
      expect(points).toHaveLength(8); // eight weeks
      expect(points.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)).toBe(true);
    }
  });
});
