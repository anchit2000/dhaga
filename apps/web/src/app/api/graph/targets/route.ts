import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getSearchIndex } from "@/lib/repo/search-index";
import { RELATIONSHIP_ENDPOINT_KINDS } from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";

/** Absent/blank means "all kinds"; unknown names in the whitelist are dropped. */
function parseKinds(param: string | null): GraphTarget["kind"][] | undefined {
  if (!param?.trim()) return undefined;
  const requested = param.split(",").map((kind) => kind.trim());
  return RELATIONSHIP_ENDPOINT_KINDS.filter((kind) => requested.includes(kind));
}

/** Typeahead for WarmPathPanel's "warm path to X" search and the
 *  add-relationship target picker. `kinds` (comma-separated, e.g.
 *  `kinds=contact,company`) restricts which node kinds are searched. Routed
 *  through the search-index gateway's prefix mode — the multi-kind read path. */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await getSearchIndex().search({
    text: q,
    kinds: parseKinds(searchParams.get("kinds")),
    matchMode: "prefix",
  });
  // Map the gateway's wider kind union back to the picker's GraphTarget shape.
  // Prefix search only ever surfaces endpoint kinds, so note/fact never appear.
  const targets: GraphTarget[] = [];
  for (const result of results) {
    if (result.kind === "note" || result.kind === "fact") continue;
    targets.push({
      id: result.id,
      label: result.label,
      kind: result.kind,
      sublabel: result.sublabel ?? null,
    });
  }
  return Response.json({ targets });
}
