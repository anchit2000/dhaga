import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { clearVocab, listVocab, removeVocab, upsertVocab } from "@/lib/repo/voice-vocab";

/**
 * /api/voice/vocab — server-side store for a user's taught dictation vocabulary.
 * The in-browser voice client mirrors this into its local dictionary, so the
 * shapes below are a contract: GET → { terms }, POST (upsert) → { term },
 * DELETE (?term= one / no query = all) → { ok }. Auth + a per-user burst guard
 * front every method; the repo is RLS-scoped per tenant.
 */

const upsertSchema = z.object({
  term: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  boost: z.number().int().min(0).max(100).optional(),
});

/** Auth + rate-limit gate. Returns the userId, or the Response to send back. */
async function authAndLimit(request: Request): Promise<string | Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  try {
    await enforceRateLimit(userId, "voice_vocab");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json(
        { error: "Too many requests — slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } },
      );
    }
    throw error;
  }
  return userId;
}

export async function GET(request: Request): Promise<Response> {
  const gate = await authAndLimit(request);
  if (gate instanceof Response) return gate;
  const terms = await listVocab();
  return Response.json({ terms });
}

export async function POST(request: Request): Promise<Response> {
  const gate = await authAndLimit(request);
  if (gate instanceof Response) return gate;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid vocabulary payload." }, { status: 400 });
  }

  const term = await upsertVocab(parsed.data.term, parsed.data.aliases ?? [], parsed.data.boost);
  return Response.json({ term });
}

export async function DELETE(request: Request): Promise<Response> {
  const gate = await authAndLimit(request);
  if (gate instanceof Response) return gate;

  const term = new URL(request.url).searchParams.get("term");
  if (term && term.trim()) {
    await removeVocab(term);
  } else {
    await clearVocab();
  }
  return Response.json({ ok: true });
}
