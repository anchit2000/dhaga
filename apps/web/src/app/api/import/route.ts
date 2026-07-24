import { z } from "zod";
import { contactProfileSchema } from "@dhaga/core";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { importContacts } from "@/lib/repo/import";
import type { ImportResponse } from "@dhaga/core/src/api/import";

/**
 * POST /api/import — bulk contact import for already-mapped candidates. The
 * mobile app (device contacts via expo-contacts) posts here with its per-user
 * `x-api-key`; the client does the field mapping so nothing raw leaves the
 * phone. Dedup + persistence is the shared importContacts pipeline (repo).
 */
const importRequestSchema = z.object({
  source: z.enum(["device", "vcard", "google", "microsoft"]),
  contacts: z
    .array(
      z.object({
        contact: contactProfileSchema,
        receipt: z.string().max(2000),
      }),
    )
    .min(1)
    .max(1000),
});

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
        { error: "Too many imports — slow down and try again shortly." },
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

  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid import payload." }, { status: 400 });
  }

  const summary = await importContacts(parsed.data.contacts, parsed.data.source);
  const response: ImportResponse = { created: summary.created, skipped: summary.skipped };
  return Response.json(response);
}
