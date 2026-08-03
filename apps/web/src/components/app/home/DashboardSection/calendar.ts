import { after } from "next/server";
import { dayLoad, findOpenSlots, type BusyInterval, type OpenSlot } from "@dhaga/core";
import { getCurrentUser } from "@/lib/auth/guard";
import { readFreeBusySnapshot, refreshFreeBusySnapshot } from "@/lib/repo/calendar";
import { DEFAULT_MEETING_DURATION_MINUTES } from "@/utils/constants/suggestions";
import type { SchedulePrefs } from "@/lib/repo/suggestion-settings";

/** Everything on Home that is derived from the connected calendars. */
export interface CalendarView {
  /** Input to the suggestion engine's meeting-load trim; empty when unknown. */
  busy: BusyInterval[];
  slots: OpenSlot[];
  overloaded: boolean;
  meetingCountToday: number;
}

const UNKNOWN: CalendarView = { busy: [], slots: [], overloaded: false, meetingCountToday: 0 };

/**
 * FREE/BUSY IS READ HERE, NEVER FETCHED. Calling a calendar provider from this
 * render would hold one of the three tenant-pool slots for the whole of an
 * outbound Google/Microsoft round-trip: the render pins a connection until
 * `after()` (lib/db/request-scope.ts), so no arrangement of awaits or Suspense
 * boundaries *inside* the request can release it — the only fix is not to make
 * the call here. Home therefore reads the stored snapshot (one row, on the
 * connection already in hand) and re-fetches after the response, where the
 * provider call holds nothing. See lib/repo/calendar/free-busy-snapshot.ts.
 *
 * DEGRADED STATE. "No snapshot" is not "nothing booked": with free/busy unknown
 * we propose no slots and claim no meeting load, because the only harmful
 * direction here is presenting time the user does not have as free. The
 * suggestion list is the exception and is deliberately left untrimmed — the
 * trim only ever shortens an already-ordered list (see the engine's `capacity`),
 * so the unknown state shows a superset in the same order, never a reordering.
 */
export async function loadCalendarView(input: {
  calendarConnected: boolean;
  now: Date;
  weekAhead: Date;
  prefs: SchedulePrefs;
}): Promise<CalendarView> {
  const { calendarConnected, now, weekAhead, prefs } = input;
  if (!calendarConnected) return UNKNOWN;

  const snapshot = await readFreeBusySnapshot(now);
  // Read the session during the render, not inside after() — a Server Component
  // may not touch request APIs from an after() callback (Next 16 `after` docs).
  const user = await getCurrentUser().catch(() => null);
  if (user && (snapshot === null || snapshot.stale)) {
    after(() => refreshFreeBusySnapshot(user.id, { from: now, to: weekAhead }));
  }
  if (!snapshot) return UNKNOWN;

  const { busy } = snapshot;
  const meetingCountToday = dayLoad({
    day: now,
    busy,
    utcOffsetMinutes: prefs.utcOffsetMinutes,
  }).meetingCount;
  return {
    busy,
    meetingCountToday,
    overloaded: meetingCountToday >= prefs.overloadThreshold,
    slots: findOpenSlots({
      range: { from: now, to: weekAhead },
      busy,
      durationMinutes: DEFAULT_MEETING_DURATION_MINUTES,
      workingHours: { startHour: prefs.startHour, endHour: prefs.endHour },
      utcOffsetMinutes: prefs.utcOffsetMinutes,
      maxSlots: 3,
      now,
    }),
  };
}
