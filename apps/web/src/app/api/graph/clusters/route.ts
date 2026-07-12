import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchGraphClusters, type ClusterDimension } from "@/lib/repo/graph-data";

const DIMENSIONS: ClusterDimension[] = ["company", "tag", "location"];

/** Level-0 "zoomed out" clusters for /app/graph, re-fetched on dimension toggle. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const dimensionParam = new URL(request.url).searchParams.get("dimension");
  const dimension = DIMENSIONS.includes(dimensionParam as ClusterDimension)
    ? (dimensionParam as ClusterDimension)
    : "company";
  const clusters = await fetchGraphClusters(dimension);
  return Response.json({ clusters });
}
