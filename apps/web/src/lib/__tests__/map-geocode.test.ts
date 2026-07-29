import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import {
  normalizeLocationQuery,
  registerGeocodingProvider,
  selectGeocodingProvider,
  type GeocodeResult,
} from "@dhaga/core/src/geocoding";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import { lookupGeocodeCache } from "@/lib/repo/geocode-cache";
import { fetchLocatableContacts, resolvePendingPlaces, type PendingPlace } from "@/lib/repo/map";
import { MAP_GEOCODE_MAX_PER_PASS } from "@/utils/constants/map";

const TEST_USER = "map-test-user";
let unregister: (() => void) | null = null;

/** A stub provider so tests never touch the live public Nominatim instance —
 *  which would be both slow (1 req/s) and a usage-policy abuse. */
function useGeocoder(geocode: (query: string) => Promise<GeocodeResult | null>): { calls: string[] } {
  const calls: string[] = [];
  unregister = registerGeocodingProvider({
    id: "map-test-geocoder",
    isConfigured: () => true,
    createClient: () => ({
      geocode: async (query: string) => {
        calls.push(query);
        return geocode(query);
      },
    }),
  });
  selectGeocodingProvider("map-test-geocoder");
  return { calls };
}

afterEach(() => {
  selectGeocodingProvider(null);
  unregister?.();
  unregister = null;
});

function pendingPlace(label: string): PendingPlace {
  return { key: normalizeLocationQuery(label), label, contactCount: 1 };
}

describe("resolvePendingPlaces", () => {
  it("NEVER caches a thrown provider error as a negative", async () => {
    const label = `Throwville ${randomUUID()}`;
    const { calls } = useGeocoder(async () => {
      throw new Error("Nominatim request failed");
    });

    const written = await resolvePendingPlaces(TEST_USER, [pendingPlace(label)]);

    expect(calls).toEqual([label]);
    expect(written).toBe(0);
    // WHY THIS TEST EXISTS: a throw means timeout / network error / non-200 —
    // the provider did not answer. Writing it as resolved=false would
    // permanently record "this place does not exist" because of a transient
    // outage, and nothing would ever retry it. The bug is invisible in manual
    // testing (the pin simply never appears), so it has to be pinned here: the
    // cache must hold NO row at all.
    expect((await lookupGeocodeCache([label])).get(normalizeLocationQuery(label))).toBeUndefined();
  });

  it("caches a definitive no-match once, so the same junk is never asked twice", async () => {
    const label = `Nowhere ${randomUUID()}`;
    const { calls } = useGeocoder(async () => null);

    expect(await resolvePendingPlaces(TEST_USER, [pendingPlace(label)])).toBe(1);
    const row = (await lookupGeocodeCache([label])).get(normalizeLocationQuery(label));
    expect(row?.resolved).toBe(false);
    expect(row?.lat).toBeNull();

    // WHY: the pass re-reads the cache before spending requests. Without that,
    // a place that resolves to nothing costs one provider request per map
    // load, forever.
    await resolvePendingPlaces(TEST_USER, [pendingPlace(label)]);
    expect(calls).toEqual([label]);
  });

  it("keeps the successes from a pass in which another place failed", async () => {
    const good = `Goodplace ${randomUUID()}`;
    const bad = `Badplace ${randomUUID()}`;
    useGeocoder(async (query) => {
      if (query === bad) throw new Error("HTTP 503");
      return { lat: 1.5, lng: 2.5, displayName: query };
    });

    // WHY: one unlucky place must not discard a batch that cost a second per
    // entry to gather, and must not stall the places queued behind it.
    expect(await resolvePendingPlaces(TEST_USER, [pendingPlace(bad), pendingPlace(good)])).toBe(1);
    const cache = await lookupGeocodeCache([good, bad]);
    expect(cache.get(normalizeLocationQuery(good))?.resolved).toBe(true);
    expect(cache.get(normalizeLocationQuery(bad))).toBeUndefined();
  });

  it("resolves at most MAP_GEOCODE_MAX_PER_PASS places in one pass", async () => {
    const { calls } = useGeocoder(async (query) => ({ lat: 0, lng: 0, displayName: query }));
    const run = randomUUID();
    const pending = Array.from({ length: MAP_GEOCODE_MAX_PER_PASS + 5 }, (_, index) =>
      pendingPlace(`Bulk ${run} ${index}`),
    );

    // WHY: the provider allows one request per second, so an unbounded pass is
    // also an unbounded function lifetime — hundreds of new places would be a
    // multi-minute background task the platform kills mid-write.
    expect(await resolvePendingPlaces(TEST_USER, pending)).toBe(MAP_GEOCODE_MAX_PER_PASS);
    expect(calls).toHaveLength(MAP_GEOCODE_MAX_PER_PASS);
  });
});

describe("fetchLocatableContacts", () => {
  it("separates contacts with location text from those without", async () => {
    const before = await fetchLocatableContacts();
    const db = await getDb();
    const placed = await createContact({ ...emptyExtractedContact(), name: `Located ${randomUUID()}` }, "manual");
    await db.update(contacts).set({ location: "  Porto  " }).where(eq(contacts.id, placed));
    const blank = await createContact({ ...emptyExtractedContact(), name: `Blank ${randomUUID()}` }, "manual");
    await db.update(contacts).set({ location: "   " }).where(eq(contacts.id, blank));
    await createContact({ ...emptyExtractedContact(), name: `Null ${randomUUID()}` }, "manual");

    const after = await fetchLocatableContacts();

    // WHY: whitespace-only location is not a location. Treating it as one puts
    // the contact in the "couldn't be placed" bucket, which reads as a
    // geocoding failure the user could fix — when nothing was ever entered.
    expect(after.missingCount - before.missingCount).toBe(2);
    expect(after.located.length - before.located.length).toBe(1);
    expect(after.located.find((row) => row.id === placed)?.location).toBe("Porto");
  });
});
