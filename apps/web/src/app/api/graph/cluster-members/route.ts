import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchClusterMembers, type ClusterDimension } from "@/lib/repo/graph-data";

const DIMENSIONS: ClusterDimension[] = ["company", "tag", "location"];

/** Level-1 "drill into a cluster" — fetched on cluster click, capped, scoped
 *  to the requesting cluster + whatever the client says is already loaded. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const dimensionParam = params.get("dimension");
  const key = params.get("key");
  if (!DIMENSIONS.includes(dimensionParam as ClusterDimension) || !key) {
    return Response.json({ error: "dimension and key are required." }, { status: 400 });
  }
  const dimension = dimensionParam as ClusterDimension;
  const search = params.get("q") ?? undefined;
  const loadedIds = params.get("loaded")?.split(",").filter(Boolean) ?? [];

  const result = await fetchClusterMembers(dimension, key, { search, loadedIds });
  return Response.json(result);
}
