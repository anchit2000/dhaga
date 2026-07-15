import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { fetchContactRelationshipGraph } from "@/lib/repo/graph-data";

/** A focused contact's interpersonal relationship edges + neighbour nodes, so
 *  the graph can draw them across company clusters (fetched on deep-link focus). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const contactId = new URL(request.url).searchParams.get("contactId");
  if (!contactId) {
    return Response.json({ error: "contactId is required." }, { status: 400 });
  }
  const result = await fetchContactRelationshipGraph(contactId);
  return Response.json(result);
}
