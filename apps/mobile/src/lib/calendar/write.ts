import { ExpoCalendar, ExpoCalendarEvent } from "expo-calendar";
import { DHAGA_CALENDAR_DESCRIPTION } from "@dhaga/core/src/calendar/follow-up-event";

import { calendarPlatform } from "./device";
import { toDeviceDates } from "./plan";

import type { CalendarWriteEvent } from "@dhaga/core/src/calendar/types";
import type { CalendarLinks, CalendarWritePlan } from "./types";

/**
 * Carrying a CalendarWritePlan out to the device. Native I/O, so untested here;
 * every decision it acts on was made in ./plan.ts, which is pure and tested.
 *
 * Two invariants this file exists to hold:
 *  - every write targets `calendar`, the Dhaga calendar, and nothing else. No
 *    call here can reach another calendar even if a stored link is wrong,
 *    because creates go through the calendar object itself.
 *  - one failed write never aborts the run. Each item is caught individually
 *    and counted, so a single rejected event cannot strand the rest — and the
 *    count is reported to the user rather than swallowed (CLAUDE.md Rule 12).
 */

export interface ApplyResult {
  /** followUpId → the event id now on the calendar, for the link store. */
  created: CalendarLinks;
  /** followUpIds whose event is confirmed gone. */
  removed: string[];
  createdCount: number;
  updatedCount: number;
  failed: number;
}

/** The follow-up's action plus where the event came from: opened from any
 *  calendar app, the event says what to do and who wrote it. */
function eventNotes(event: CalendarWriteEvent): string {
  if (!event.description) return DHAGA_CALENDAR_DESCRIPTION;
  return `${event.description}\n\n${DHAGA_CALENDAR_DESCRIPTION}`;
}

export async function applyCalendarPlan(
  calendar: ExpoCalendar,
  plan: CalendarWritePlan,
): Promise<ApplyResult> {
  const result: ApplyResult = {
    created: {},
    removed: [],
    createdCount: 0,
    updatedCount: 0,
    failed: 0,
  };

  for (const { followUpId, event } of plan.creates) {
    const eventId = await createEvent(calendar, event);
    if (eventId) {
      result.created[followUpId] = eventId;
      result.createdCount += 1;
    } else result.failed += 1;
  }

  for (const { followUpId, eventId, event } of plan.updates) {
    if (await updateEvent(eventId, event)) {
      result.updatedCount += 1;
      continue;
    }
    // The event is gone — the user deleted it in their calendar app, or the
    // stored id went stale. The follow-up is still open, so it still belongs on
    // the calendar: re-create rather than silently losing it. Matches the web
    // write-out, where a stale id makes upsertEvent create a fresh event.
    const recreated = await createEvent(calendar, event);
    if (recreated) {
      result.created[followUpId] = recreated;
      result.createdCount += 1;
    } else result.failed += 1;
  }

  for (const { followUpId, eventId } of plan.deletes) {
    // Deleting an event that is already gone is success, not failure: the goal
    // is "this follow-up has no event", and it does not.
    await deleteEvent(eventId);
    result.removed.push(followUpId);
  }

  return result;
}

async function createEvent(
  calendar: ExpoCalendar,
  event: CalendarWriteEvent,
): Promise<string | null> {
  try {
    const created = await calendar.createEvent({
      title: event.title,
      ...toDeviceDates(calendarPlatform(), event),
      allDay: event.allDay,
      notes: eventNotes(event),
    });
    return created.id;
  } catch {
    // Never log the error: a provider/OS message can echo the event content,
    // which names a contact.
    return null;
  }
}

async function updateEvent(eventId: string, event: CalendarWriteEvent): Promise<boolean> {
  try {
    const existing = await ExpoCalendarEvent.get(eventId);
    await existing.update({
      title: event.title,
      ...toDeviceDates(calendarPlatform(), event),
      allDay: event.allDay,
      notes: eventNotes(event),
    });
    return true;
  } catch {
    return false;
  }
}

async function deleteEvent(eventId: string): Promise<void> {
  try {
    const existing = await ExpoCalendarEvent.get(eventId);
    await existing.delete();
  } catch {
    // Already gone.
  }
}
