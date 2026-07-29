import { z } from "zod";
import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { pushContactSync } from "@/lib/repo/sync";
import { SYNC_MAX_CONTACTS, SYNC_MAX_OBSERVED_IDS } from "@/utils/constants/sync";
import { syncPushRequestSchema } from "./schema";
import type { SyncPushRequest, SyncPushResponse } from "@dhaga/core/src/api/sync";

/**
 * POST /api/sync/contacts — two-way contact sync (SyncPushRequest →
 * SyncPushResponse). The client ships what it observed in the external address
 * book and applies the writes it gets back; the three-way merge runs here,
 * because the server is what holds the per-link base snapshot two devices would
 * otherwise disagree about.
 *
 * An address book larger than SYNC_MAX_CONTACTS arrives as several sequential
 * requests, each `full: false`, with the container's whole id set on the last
 * one as `observedExternalIds` — that, not `full`, is what authorises the
 * deletion sweep for a chunked run (see lib/repo/sync/sweep.ts).
 *
 * `?pushUnlinked=1` additionally offers Dhaga contacts that have no link on
 * this provider as creates. It is a query param, not a body field, because the
 * body shape is the shared contract and must not drift: this is a caller
 * decision about direction, not part of what the device observed.
 *
 * Rate limited on the `import` bucket — same shape of work (one bulk contact
 * batch per call) against the same tables.
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

  // Size first, so an address book bigger than one batch gets an answer it can
  // act on instead of a generic "invalid payload" it cannot diagnose.
  const size = z
    .object({
      contacts: z.array(z.unknown()),
      observedExternalIds: z.array(z.unknown()).nullish(),
    })
    .safeParse(body);
  if (size.success && size.data.contacts.length > SYNC_MAX_CONTACTS) {
    return Response.json(
      { error: `Too many contacts in one sync — send at most ${SYNC_MAX_CONTACTS} per request.` },
      { status: 413 },
    );
  }
  // Separate ceiling, separate message: the id list is what a chunked run sends
  // instead of a `full` batch, and a client that hits this limit has to be told
  // it was the SWEEP that was too big, not the contacts — the two are chunked
  // (or not) by completely different rules.
  if (size.success && (size.data.observedExternalIds?.length ?? 0) > SYNC_MAX_OBSERVED_IDS) {
    return Response.json(
      {
        error: `Too many contact ids in one sync — send at most ${SYNC_MAX_OBSERVED_IDS} observed ids per request.`,
      },
      { status: 413 },
    );
  }

  const parsed = syncPushRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid sync payload." }, { status: 400 });
  }

  const pushUnlinked = new URL(request.url).searchParams.get("pushUnlinked") === "1";
  const response: SyncPushResponse = await pushContactSync(
    userId,
    parsed.data satisfies SyncPushRequest,
    { pushUnlinked },
  );
  return Response.json(response);
}
