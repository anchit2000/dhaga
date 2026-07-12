import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { searchGraphTargets } from "@/lib/repo/graph-data";

/** Typeahead for WarmPathPanel's "warm path to X" search. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const targets = await searchGraphTargets(q);
  return Response.json({ targets });
}
