import { followUpToCalendarEvent } from "@dhaga/core/src/calendar/follow-up-event";

import type { CalendarWriteEvent } from "@dhaga/core/src/calendar/types";
import type {
  CalendarLinks,
  CalendarPlatform,
  CalendarWritePlan,
  FollowUpSummary,
} from "./types";

const DAY_MS = 86_400_000;

/**
 * Deciding WHAT to write to the Dhaga calendar. Pure — no native module — and
 * driven entirely by followUpToCalendarEvent from @dhaga/core, so the phone and
 * the web write-out cannot drift on what a follow-up looks like as an event.
 */

/** A due date the server sent, or null when it is absent or unparseable. An
 *  Invalid Date would reach the OS as a broken event, so it is dropped here. */
function toDueDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The creates/updates/deletes that bring the Dhaga calendar in line with the
 * follow-ups the server currently holds.
 *
 * Deletion is reached two ways, and both matter:
 *  - followUpToCalendarEvent returns null (done, dismissed, or the due date was
 *    cleared) while we still hold a link — the follow-up is still there, its
 *    event must not be;
 *  - the follow-up is absent from `followUps` entirely — it was deleted on the
 *    server, and an event nobody can see the source of would be left behind.
 * Without the second rule a deleted follow-up haunts the user's calendar
 * forever, because nothing would ever mention it again.
 */
export function planCalendarWrites(
  followUps: FollowUpSummary[],
  links: CalendarLinks,
): CalendarWritePlan {
  const plan: CalendarWritePlan = { creates: [], updates: [], deletes: [] };
  const seen = new Set<string>();

  for (const followUp of followUps) {
    seen.add(followUp.id);
    const event = followUpToCalendarEvent({
      contactName: followUp.contactName ?? followUp.companyName ?? null,
      action: followUp.action,
      dueDate: toDueDate(followUp.dueDate),
      status: followUp.status,
    });
    const eventId = links[followUp.id];
    if (event && eventId) plan.updates.push({ followUpId: followUp.id, eventId, event });
    else if (event) plan.creates.push({ followUpId: followUp.id, event });
    else if (eventId) plan.deletes.push({ followUpId: followUp.id, eventId });
  }

  for (const [followUpId, eventId] of Object.entries(links)) {
    if (!seen.has(followUpId)) plan.deletes.push({ followUpId, eventId });
  }
  return plan;
}

/**
 * The link map after a run. Only follow-ups whose event was actually written
 * are recorded, and only ones whose event was actually removed are dropped — a
 * write the OS rejected keeps its old link, so the next run retries it instead
 * of creating a duplicate alongside the event it failed to update.
 */
export function linksAfterWrites(
  links: CalendarLinks,
  created: CalendarLinks,
  removed: string[],
): CalendarLinks {
  const next: CalendarLinks = { ...links, ...created };
  for (const followUpId of removed) delete next[followUpId];
  return next;
}

/**
 * The start/end pair the platform's own calendar store expects for an all-day
 * event. The two disagree, and getting it wrong shows the user a follow-up
 * spanning two days:
 *  - iOS/EventKit treats an all-day event's end date as INCLUSIVE — the last
 *    day the event covers — so a one-day follow-up ends on the day it starts.
 *  - Android/CalendarContract treats DTEND as EXCLUSIVE — midnight after the
 *    last day — which is exactly what CalendarWriteEvent already carries.
 * Timed events are untouched: only the all-day convention differs.
 */
export function toDeviceDates(
  platform: CalendarPlatform,
  event: CalendarWriteEvent,
): { startDate: Date; endDate: Date } {
  if (event.allDay && platform === "ios") {
    return { startDate: event.start, endDate: new Date(event.end.getTime() - DAY_MS) };
  }
  return { startDate: event.start, endDate: event.end };
}
