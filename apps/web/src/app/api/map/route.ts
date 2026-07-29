import { createHash } from "node:crypto";
import { after } from "next/server";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchMapView, resolvePendingPlaces } from "@/lib/repo/map";

/** `after()` work counts toward the route's lifetime, and the deferred geocode
 *  pass runs at the provider's 1 request/second (MAP_GEOCODE_MAX_PER_PASS
 *  seconds worst case). This keeps that comfortably inside the budget. */
export const maxDuration = 60;

/** The whole map in one payload (mirrors /api/graph/full's full-load shape):
 *  contacts grouped by their normalized location text, plus the two counts
 *  that keep the view honest about who ISN'T shown.
 *
 *  Served from the geocode cache ONLY — nothing here waits on a geocoding
 *  provider. Uncached places are resolved in a bounded pass after the response
 *  (see resolvePendingPlaces), so the map fills in across loads rather than
 *  holding a request open for one second per new city.
 *
 *  ETag: unlike /api/graph/full this is a hash of the payload ITSELF, not a
 *  cheap version query — and that is load-bearing, not a shortcut. A
 *  contacts-derived version query could not see the SHARED geocode_cache table
 *  changing, so it would keep answering 304 while the deferred pass fills the
 *  map in — precisely when the client is polling to watch it fill. Hashing the
 *  payload means every field the client polls FOR is inside the hash: each
 *  pass moves contacts out of pendingCount and into places, so the hash always
 *  moves with them and a stalled 304 is impossible. The payload is kilobytes,
 *  so this is cheap; it saves bandwidth on a poll, not server work.
 *  Cache-Control is no-store for the same reason as the graph: the client owns
 *  its cache, the browser must not double-buffer it. */
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  const { payload, pending } = await fetchMapView();
  if (pending.length > 0) {
    // Scheduled even when the response is a 304: a polling client is exactly
    // how the remaining places get resolved. PII-safe catch — a background
    // pass must never surface as an unhandled rejection.
    after(() =>
      resolvePendingPlaces(userId, pending).catch((error: unknown) => {
        console.error("[map-geocode] deferred pass failed", {
          name: error instanceof Error ? error.name : typeof error,
          code: (error as { code?: unknown } | null)?.code,
        });
      }),
    );
  }

  const etag = `"${createHash("md5").update(JSON.stringify(payload)).digest("hex")}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((candidate) => candidate.trim() === etag)) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return Response.json(payload, {
    headers: { ETag: etag, "Cache-Control": "private, no-store" },
  });
}
