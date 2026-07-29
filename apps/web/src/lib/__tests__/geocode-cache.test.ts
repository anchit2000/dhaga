import { describe, expect, it } from "vitest";
import { lookupGeocodeCache, saveGeocodeResults } from "@/lib/repo/geocode-cache";

/**
 * The geocode cache is a ToS obligation, not a speed-up: the default provider
 * (Nominatim) allows 1 request/second and forbids systematic querying, so a
 * place that misses here becomes another request. Every test below asserts a
 * case where a miss would mean re-querying something we already asked about.
 */
describe("geocode cache", () => {
  it("matches on the normalized key, so a re-typed place is not re-queried", async () => {
    await saveGeocodeResults([
      { query: "Bengaluru, India", result: { lat: 12.97, lng: 77.59, displayName: "Bengaluru, India" }, provider: "nominatim" },
    ]);

    const hits = await lookupGeocodeCache(["  BENGALURU ,India "]);
    const hit = hits.get("bengaluru, india");
    expect(hit?.resolved).toBe(true);
    expect(hit?.lat).toBeCloseTo(12.97);
    expect(hit?.lng).toBeCloseTo(77.59);
  });

  it("stores a definitive no-match as a negative instead of forgetting it", async () => {
    await saveGeocodeResults([{ query: "Remote", result: null, provider: "nominatim" }]);

    const hit = (await lookupGeocodeCache(["remote"])).get("remote");
    // Present (so it is never asked again) but explicitly unresolved, with no
    // phantom coordinates that could put a pin at 0,0.
    expect(hit).toBeDefined();
    expect(hit?.resolved).toBe(false);
    expect(hit?.lat).toBeNull();
    expect(hit?.lng).toBeNull();
  });

  it("upgrades a cached negative when the place later resolves", async () => {
    await saveGeocodeResults([{ query: "Rājkot", result: null, provider: "nominatim" }]);
    await saveGeocodeResults([
      { query: "Rājkot", result: { lat: 22.3, lng: 70.8, displayName: "Rajkot, Gujarat, India" }, provider: "nominatim" },
    ]);

    const hit = (await lookupGeocodeCache(["rājkot"])).get("rājkot");
    expect(hit?.resolved).toBe(true);
    expect(hit?.displayName).toBe("Rajkot, Gujarat, India");
  });

  /**
   * A batch geocode collects locations from many contacts, so the same place
   * arrives more than once. Postgres rejects an ON CONFLICT DO UPDATE that
   * hits one row twice in a single statement — if this throws, an entire
   * batch's results are lost and get re-queried.
   */
  it("survives duplicate places within one batch", async () => {
    await expect(
      saveGeocodeResults([
        { query: "Porto", result: { lat: 41.1, lng: -8.6, displayName: "Porto" }, provider: "nominatim" },
        { query: "porto ", result: { lat: 41.2, lng: -8.7, displayName: "Porto, Portugal" }, provider: "nominatim" },
      ]),
    ).resolves.toBeUndefined();

    expect((await lookupGeocodeCache(["Porto"])).get("porto")?.displayName).toBe("Porto, Portugal");
  });

  it("never queries the database for empty or unusable location text", async () => {
    expect(await lookupGeocodeCache([])).toEqual(new Map());
    expect(await lookupGeocodeCache(["   ", ","])).toEqual(new Map());
    await expect(saveGeocodeResults([{ query: "  ", result: null, provider: "nominatim" }])).resolves.toBeUndefined();
  });
});
