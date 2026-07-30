import { CaptureError, errorMessage } from "@/lib/api";
import { SYNC_ACK_PATH, SYNC_PUSH_PATH } from "@/utils/constants/sync";

import type {
  SyncAckRequest,
  SyncAckResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "@dhaga/core/src/api/sync";
import type { MobileSettings } from "@/types";

/**
 * Two-way contact-sync transport, over the same thin-client shape as
 * lib/api.ts (whose CaptureError + errorMessage are reused, no duplicate
 * transport). Never logs the contacts in either direction.
 */

/**
 * POST /api/sync/contacts — ship what the device address book holds, get back
 * the writes to apply to it. The three-way merge runs on the server, which is
 * where the last-synced base snapshot lives.
 *
 * `pushUnlinked` is the server's `?pushUnlinked=1`: it additionally offers
 * every Dhaga contact with no link here as a create. Off unless the user asks,
 * because copying a whole CRM into someone's personal address book is a large,
 * awkward-to-undo write they did not request.
 */
export async function pushContactSync(
  settings: MobileSettings,
  request: SyncPushRequest,
  pushUnlinked: boolean,
): Promise<SyncPushResponse> {
  const path = pushUnlinked ? `${SYNC_PUSH_PATH}?pushUnlinked=1` : SYNC_PUSH_PATH;
  const response = await post(settings, path, request, "Contact sync failed");
  return (await response.json()) as SyncPushResponse;
}

/**
 * POST /api/sync/contacts/ack — report the ids the address book assigned.
 * Required, not best-effort: a created contact has no id until the platform
 * mints one, so skipping this makes the next sync fail to recognise its own
 * write and create a duplicate.
 */
export async function ackContactSync(
  settings: MobileSettings,
  request: SyncAckRequest,
): Promise<SyncAckResponse> {
  const response = await post(settings, SYNC_ACK_PATH, request, "Couldn't confirm the sync");
  return (await response.json()) as SyncAckResponse;
}

async function post(
  settings: MobileSettings,
  path: string,
  body: SyncPushRequest | SyncAckRequest,
  failure: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `${failure} (HTTP ${response.status}). Try again.`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  return response;
}
