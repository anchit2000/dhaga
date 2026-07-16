import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { upsertLayout } from "@/lib/repo/graph-layouts";
import { GRAPH_LAYOUT_MAX_BYTES } from "@/utils/constants/graph";
import type { GraphLayoutSnapshot } from "@/lib/repo/graph-data/types";

/** Hand-rolled shape check (no Zod): a 50k-node position record is the one
 *  body in the app where per-key schema machinery would cost real time. */
function parseLayoutBody(body: unknown): GraphLayoutSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const { hash, positions } = body as { hash?: unknown; positions?: unknown };
  if (typeof hash !== "string" || hash.length === 0 || hash.length > 64) return null;
  if (!positions || typeof positions !== "object" || Array.isArray(positions)) return null;
  const record: Record<string, [number, number]> = {};
  for (const [id, pos] of Object.entries(positions)) {
    if (!Array.isArray(pos) || pos.length !== 2) return null;
    const [x, y] = pos as unknown[];
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    if (typeof y !== "number" || !Number.isFinite(y)) return null;
    record[id] = [x, y];
  }
  return { hash, positions: record };
}

/** Persist a settled client layout so the user's other devices skip FA2.
 *  Fire-and-forget from the client (layout-sync.ts) — one row per user. */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  // Size-guard before reading/parsing; text.length re-checks it after (a
  // client can omit or understate Content-Length).
  if (Number(request.headers.get("content-length") ?? 0) > GRAPH_LAYOUT_MAX_BYTES) {
    return Response.json({ error: "Layout too large." }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > GRAPH_LAYOUT_MAX_BYTES) {
    return Response.json({ error: "Layout too large." }, { status: 413 });
  }

  let parsed: GraphLayoutSnapshot | null = null;
  try {
    parsed = parseLayoutBody(JSON.parse(text));
  } catch {
    // fall through to the 400 below
  }
  if (!parsed) return Response.json({ error: "Invalid layout body." }, { status: 400 });

  await upsertLayout(parsed.hash, parsed.positions);
  return Response.json({ ok: true });
}
