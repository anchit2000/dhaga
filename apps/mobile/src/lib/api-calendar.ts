import { CaptureError, errorMessage } from "@/lib/api";
import { FOLLOW_UPS_PATH } from "@/utils/constants/calendar";

import type { FollowUpSummary, FollowUpsResponse } from "@/lib/calendar/types";
import type { MobileSettings } from "@/types";

/**
 * Follow-up transport for the calendar screen, over the same thin-client shape
 * as lib/api.ts (whose CaptureError + errorMessage are reused, no duplicate
 * transport). Never logs the follow-ups: an action line names a third party and
 * says something about them.
 *
 * GET /api/follow-ups does not exist yet — see FOLLOW_UPS_PATH for why, and why
 * the obvious substitute is worse. Until it ships this call 404s, the calendar
 * screen reports it plainly, and the device half of the screen carries on. When
 * the route lands nothing here changes but the fact that it answers.
 */
export async function fetchFollowUps(settings: MobileSettings): Promise<FollowUpSummary[]> {
  let response: Response;
  try {
    response = await fetch(`${settings.baseUrl}${FOLLOW_UPS_PATH}`, {
      headers: { "x-api-key": settings.apiKey },
    });
  } catch {
    throw new CaptureError(
      "Couldn't reach Dhaga — check the server address and that your phone is on the same network.",
    );
  }
  if (!response.ok) {
    const fallback = `Couldn't load your follow-ups (HTTP ${response.status}).`;
    throw new CaptureError(await errorMessage(response, fallback), response.status);
  }
  const body = (await response.json()) as FollowUpsResponse;
  return Array.isArray(body.followUps) ? body.followUps : [];
}
