import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchTagLayer, fetchTagSpokes } from "@/lib/repo/graph-data";

/** The tag layer, fetched lazily when the client's Tags layer is first
 *  enabled. Excluded from /api/graph/full because contacts × tags is the
 *  payload's one unbounded multiplier. Hubs always ship; spoke edges only
 *  under GRAPH_TAG_EDGE_BUDGET — past it, ?tag={slug} loads one tag's
 *  spokes (capped at GRAPH_TAG_SPOKE_CAP) on demand. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const tag = new URL(request.url).searchParams.get("tag");
  return Response.json(tag ? await fetchTagSpokes(tag) : await fetchTagLayer());
}
