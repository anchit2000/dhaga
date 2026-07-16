import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchFullGraph, fetchGraphVersion } from "@/lib/repo/graph-data";

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
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const etag = `"${await fetchGraphVersion()}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((candidate) => candidate.trim() === etag)) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  const payload = await fetchFullGraph();
  return Response.json(payload, {
    headers: { ETag: etag, "Cache-Control": "private, no-store" },
  });
}
