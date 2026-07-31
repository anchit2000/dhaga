import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { aiGateReason } from "@/lib/ai/gate";

/**
 * The AI-credit gate for controls that have NO server component above them to
 * hand the answer down: the nav's Ask Dhaga palette and its quick-add dialog
 * both mount from the client-only app shell. Every other AI control resolves
 * `aiGateReason` on the server that renders it and passes it as a prop — this
 * route exists so those two surfaces don't need one, not as a general pattern.
 *
 * Fetched lazily (only when the palette/dialog opens), so it costs nothing on a
 * plain page view. Advisory only: `assertAiBudget` still refuses a stale client.
 */
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  return Response.json({ reason: await aiGateReason(userId) });
}
