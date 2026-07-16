import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { searchGraphTargets, type GraphTargetKind } from "@/lib/repo/graph-data";
import { RELATIONSHIP_ENDPOINT_KINDS } from "@/utils/constants/graph";

/** Absent/blank means "all kinds"; unknown names in the whitelist are dropped. */
function parseKinds(param: string | null): readonly GraphTargetKind[] | undefined {
  if (!param?.trim()) return undefined;
  const requested = param.split(",").map((kind) => kind.trim());
  return RELATIONSHIP_ENDPOINT_KINDS.filter((kind) => requested.includes(kind));
}

/** Typeahead for WarmPathPanel's "warm path to X" search and the
 *  add-relationship target picker. `kinds` (comma-separated, e.g.
 *  `kinds=contact,company`) restricts which node kinds are searched. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const kinds = parseKinds(searchParams.get("kinds"));
  const targets = kinds
    ? await searchGraphTargets(q, kinds)
    : await searchGraphTargets(q);
  return Response.json({ targets });
}
