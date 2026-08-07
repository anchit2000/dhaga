import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { getCalendarFollowUps } from "@/lib/repo/reminders";
import type { FollowUpsResponse } from "@dhaga/core/src/api/follow-ups";

/**
 * Open follow-ups for the signed-in user.
 *
 * Exists for the mobile device-calendar screen: the web app renders its calendar
 * from a server component, so nothing published follow-ups over HTTP. The only
 * route that already carried them, `GET /api/export/json`, also embeds every
 * scanned business card as base64 — tens of megabytes per calendar refresh.
 *
 * Session-or-`x-api-key` auth via requireUserIdFromRequest, the same guard the
 * sync endpoints use, because the mobile app authenticates with a per-user API
 * key rather than a cookie.
 *
 * Read-only and cheap, so it is deliberately NOT rate-limited on the `import`
 * bucket the sync routes use: a calendar screen refreshes far more often than a
 * sync runs, and sharing that bucket would let opening the calendar exhaust the
 * user's ability to sync.
 */
export async function GET(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  // One scoped connection for the whole read, like every other tenant read.
  const followUps = await withUserDb(userId, () => getCalendarFollowUps());

  const body: FollowUpsResponse = {
    followUps: followUps.map((followUp) => ({
      id: followUp.id,
      contactId: followUp.contactId,
      contactName: followUp.contactName,
      companyId: followUp.companyId,
      companyName: followUp.companyName,
      action: followUp.action,
      dueDate: followUp.dueDate,
      dueHint: followUp.dueHint,
      recurrence: followUp.recurrence,
      // getCalendarFollowUps reads listAllOpenFollowUps, so every row here is
      // open by construction. `overdue` is deliberately dropped: it is a
      // derived view concern, and the client re-derives it against the device's
      // own clock and timezone rather than the server's.
      status: "open",
    })),
  };
  return Response.json(body);
}
