import { describe, expect, it } from "vitest";
import { encodeGeohash } from "@dhaga/core/src/geo/geohash";

/**
 * BRD §6.2 mobile session clustering keys sessions off geohash-6 equality —
 * these cases pin down what that comparison actually relies on: a known
 * reference vector, and that "same place" vs "different place" produce the
 * same/different geohash-6 the clustering code will compare.
 */
describe("encodeGeohash", () => {
  it("matches the well-known Wikipedia reference vector (Skagen, Denmark)", () => {
    expect(encodeGeohash(57.64911, 10.40744, 6)).toBe("u4pruy");
  });

  it("defaults to precision 6", () => {
    expect(encodeGeohash(57.64911, 10.40744)).toBe("u4pruy");
    expect(encodeGeohash(57.64911, 10.40744)).toHaveLength(6);
  });

  it("is deterministic: the same coordinates always geohash the same", () => {
    expect(encodeGeohash(12.9716, 77.5946)).toBe(encodeGeohash(12.9716, 77.5946));
  });

  it("two points a city block apart share a geohash-6 (same cluster cell)", () => {
    // ~50m apart — well inside a geohash-6 cell (~1.2km x 0.6km).
    expect(encodeGeohash(12.97160, 77.59460)).toBe(encodeGeohash(12.97165, 77.59465));
  });

  it("two points in different cities do not share a geohash-6", () => {
    const bangalore = encodeGeohash(12.9716, 77.5946);
    const mumbai = encodeGeohash(19.076, 72.8777);
    expect(bangalore).not.toBe(mumbai);
  });
});
