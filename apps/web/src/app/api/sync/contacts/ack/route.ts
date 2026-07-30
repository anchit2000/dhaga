import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { ackContactSync } from "@/lib/repo/sync";
import { syncAckRequestSchema } from "../schema";
import type { SyncAckRequest, SyncAckResponse } from "@dhaga/core/src/api/sync";

/**
 * POST /api/sync/contacts/ack — the client reports the ids the address book
 * assigned to the writes it just applied (SyncAckRequest → SyncAckResponse).
 *
 * Not optional: a created record has no id until the platform mints one, so
 * without this call the next sync would not recognise its own write and would
 * push a duplicate of every contact it just created.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  try {
    await enforceRateLimit(userId, "import");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many sync runs — slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = syncAckRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid ack payload." }, { status: 400 });
  }

  const response: SyncAckResponse = await ackContactSync(
    userId,
    parsed.data satisfies SyncAckRequest,
  );
  return Response.json(response);
}
