import { describe, expect, it } from "vitest";
import { normalizeLocationQuery } from "@dhaga/core/src/geocoding";
import type { GeocodeCacheRow } from "@/lib/db/schema";
import { assemblePlaces, type AssembledPlaces, type LocatableContact } from "@/lib/repo/map";

function contactRow(name: string, location: string): LocatableContact {
  return { id: `c-${name}`, name, location };
}

/** A cache row as the DB returns it: coordinates for a hit, `null` for a
 *  definitive no-match (resolved=false + NULL coords, the shape the table's
 *  CHECK constraint enforces). */
function cacheRow(query: string, coords: { lat: number; lng: number } | null): [string, GeocodeCacheRow] {
  const key = normalizeLocationQuery(query);
  const row: GeocodeCacheRow = {
    queryKey: key,
    queryText: query,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    displayName: coords ? query : null,
    resolved: coords !== null,
    provider: "test",
    checkedAt: new Date(),
  };
  return [key, row];
}

/**
 * assemblePlaces decides what goes on the map, what is honestly reported as
 * not shown, and — the expensive part — what gets asked of the geocoding
 * provider. Every case below is one where getting it wrong either misleads the
 * user about who is on the map or spends a second of a 1-request/second budget.
 */
describe("assemblePlaces", () => {
  it("collapses different spellings of one place into a single pin and a single lookup", () => {
    const { places, pending } = assemblePlaces(
      [contactRow("Ana", "Bengaluru, India"), contactRow("Bo", "  BENGALURU ,India ")],
      new Map([cacheRow("bengaluru, india", { lat: 12.97, lng: 77.59 })]),
    );

    // WHY: two pins for one city would double-count the network AND — because
    // `pending` is what the deferred pass asks the provider — cost a second
    // lookup of a place already answered, which the usage policy forbids.
    expect(places).toHaveLength(1);
    expect(places[0].contacts.map((contact) => contact.name)).toEqual(["Ana", "Bo"]);
    expect(pending).toEqual([]);
  });

  it("counts an un-cached place as PENDING, never as unresolved", () => {
    const { places, unresolvedCount, pendingCount, pending } = assemblePlaces(
      [contactRow("Dee", "Porto"), contactRow("Eli", "Porto")],
      new Map(),
    );

    expect(places).toEqual([]);
    // WHY: these two counts are trivially swappable and the failure is silent.
    // Reported as unresolved, the client is told "waiting will not help" about
    // contacts a background pass is seconds from placing — so it never
    // refetches, and the map stays empty in a way that reads as missing data
    // rather than a bug. Pending is the ONLY signal that a refetch is worth it.
    expect(pendingCount).toBe(2);
    expect(unresolvedCount).toBe(0);
    expect(pending).toEqual([{ key: "porto", label: "Porto", contactCount: 2 }]);
  });

  it("counts a cached no-match as UNRESOLVED, never as pending, and never re-queues it", () => {
    const { places, unresolvedCount, pendingCount, pending } = assemblePlaces(
      [contactRow("Cy", "Remote")],
      new Map([cacheRow("remote", null)]),
    );

    expect(places).toEqual([]);
    // WHY (the mirror of the test above): the negative IS the answer. Calling
    // it pending would have the client poll forever for a pin that can never
    // appear; re-queuing it would ask the provider about "Remote" on every
    // page view — the systematic querying the cache exists to prevent.
    expect(unresolvedCount).toBe(1);
    expect(pendingCount).toBe(0);
    expect(pending).toEqual([]);
  });

  it("treats text that normalizes to nothing as a dead end, not as pending work", () => {
    const { unresolvedCount, pendingCount, pending } = assemblePlaces([contactRow("Fay", ",")], new Map());

    // WHY: "," is not a place. Looking it up burns a second of the budget to
    // learn nothing, so it is never queued — and since it can never resolve,
    // calling it pending would make the client poll for it forever.
    expect(pending).toEqual([]);
    expect(unresolvedCount).toBe(1);
    expect(pendingCount).toBe(0);
  });

  it("produces identical output for the same rows in a different order", () => {
    const rows = [contactRow("Gil", "Lisbon"), contactRow("Hana", "Porto"), contactRow("Ivo", "Lisbon")];
    const cache = new Map([cacheRow("lisbon", { lat: 38.7, lng: -9.1 }), cacheRow("porto", { lat: 41.1, lng: -8.6 })]);

    // WHY: the route's ETag is a hash of this payload and Postgres returns rows
    // in no guaranteed order — an order-sensitive assembly would change the
    // ETag on every fetch and silently defeat 304 revalidation.
    expect(assemblePlaces([...rows].reverse(), cache)).toEqual(assemblePlaces(rows, cache));
  });

  it("changes the hashed payload when a pending place resolves", () => {
    const rows = [contactRow("Jo", "Porto"), contactRow("Kim", "Porto")];
    const before = assemblePlaces(rows, new Map());
    const after = assemblePlaces(rows, new Map([cacheRow("porto", { lat: 41.1, lng: -8.6 })]));
    // Exactly the fields the route serializes into the ETag.
    const hashed = (result: AssembledPlaces): string =>
      JSON.stringify({
        places: result.places,
        unresolvedCount: result.unresolvedCount,
        pendingCount: result.pendingCount,
      });

    // WHY: this is the whole reason pendingCount exists. The client polls to
    // watch the map fill in; if a background pass could resolve places without
    // moving the hash, every poll would 304 and the client would never learn.
    expect(hashed(before)).not.toBe(hashed(after));
    expect(before.pendingCount).toBe(2);
    expect(after.pendingCount).toBe(0);
    expect(after.places).toHaveLength(1);
  });
});
