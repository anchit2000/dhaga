import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getCachedFullGraph } from "@/lib/cache/graph";
import { fetchGraphVersion } from "@/lib/repo/graph-data";

/** The whole graph in one payload (full-load architecture): every node kind,
 *  explicit edges, synthesized works_at/attended edges, and the user's saved
 *  layout (if any). The client computes layout, degree, and filtering
 *  locally. Tag hubs/tagged edges are lazy-loaded from /api/graph/tags when
 *  the Tags layer is enabled.
 *
 *  Responses carry an ETag (cheap aggregate version, see fetchGraphVersion)
 *  and honor If-None-Match with a 304, so the client's IndexedDB copy can
 *  revalidate a multi-MB payload for the price of one aggregate query.
 *  Cache-Control is no-store: the IndexedDB cache is the single client cache;
 *  double-buffering the payload in the browser's HTTP cache would waste
 *  the user's disk and mask our revalidation. */
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const version = await fetchGraphVersion();
  const etag = `"${version}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((candidate) => candidate.trim() === etag)) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  // Version-keyed server cache: the multi-table assembly runs once per graph
  // version across all of this user's clients/instances; unchanged versions
  // are served without touching Postgres (only the cheap version query above).
  const payload = await getCachedFullGraph(userId, version);
  return Response.json(payload, {
    headers: { ETag: etag, "Cache-Control": "private, no-store" },
  });
}
