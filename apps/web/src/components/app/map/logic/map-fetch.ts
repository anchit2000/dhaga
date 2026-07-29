import type { MapPayload } from "@/types";

/** The map's only endpoint — kept in one place so correcting it is a one-line
 *  change (mirrors the graph's `logic/graph-fetch.ts`). */
const MAP_PAYLOAD_URL = "/api/map";

export interface FetchedMap {
  payload: MapPayload;
  etag: string | null;
}

/** GET /api/map, optionally conditional.
 *
 *  "unchanged" mirrors a 304, and it is neither an error nor an empty map:
 *  while the deferred geocode pass is still running it is the NORMAL answer,
 *  and the caller keeps both the payload it already has and its polling
 *  schedule. The route ETags a hash of the payload itself — `pendingCount`
 *  included — so the moment a pass resolves anything the hash moves and this
 *  returns a 200 with the fuller map. */
export async function fetchMapPayload(
  ifNoneMatch: string | null,
): Promise<FetchedMap | "unchanged"> {
  const res = await fetch(
    MAP_PAYLOAD_URL,
    ifNoneMatch ? { headers: { "if-none-match": ifNoneMatch } } : undefined,
  );
  if (res.status === 304) return "unchanged";
  // The page is guarded, so a 401 here means the session died under us.
  if (res.status === 401) {
    throw new Error("Your session expired — reload the page to sign in again.");
  }
  if (!res.ok) throw new Error(`Map request failed (${res.status})`);
  return { payload: (await res.json()) as MapPayload, etag: res.headers.get("etag") };
}
