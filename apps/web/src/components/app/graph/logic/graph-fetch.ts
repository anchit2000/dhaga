import type { CachedGraphPayload } from "./payload-cache";
import type { FullGraphPayload } from "../types";

export interface FetchedGraph {
  payload: FullGraphPayload;
  etag: string | null;
  bytes: number;
}

/** GET /api/graph/full, optionally conditional: "unchanged" mirrors a 304
 *  (only reachable when an If-None-Match validator was sent). */
export async function fetchGraph(ifNoneMatch: string | null): Promise<FetchedGraph | "unchanged"> {
  const res = await fetch(
    "/api/graph/full",
    ifNoneMatch ? { headers: { "if-none-match": ifNoneMatch } } : undefined,
  );
  if (res.status === 304) return "unchanged";
  if (!res.ok) throw new Error(`Graph request failed (${res.status})`);
  const text = await res.text(); // parsed by hand so payloadBytes is known
  return {
    payload: JSON.parse(text) as FullGraphPayload,
    etag: res.headers.get("etag"),
    bytes: text.length,
  };
}

/** A response is only cacheable when it carried a validator to revalidate with. */
export function toCacheEntry(fetched: FetchedGraph): CachedGraphPayload | null {
  if (!fetched.etag) return null;
  return {
    etag: fetched.etag,
    payload: fetched.payload,
    payloadBytes: fetched.bytes,
    storedAt: Date.now(),
  };
}
