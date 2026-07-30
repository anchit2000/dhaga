import { CaptureError } from "@/lib/api";
import { fetchFollowUps } from "@/lib/api-calendar";
import { AGENDA_DAYS_AHEAD, AGENDA_DAYS_BACK } from "@/utils/constants/calendar";

import { buildAgenda, unscheduledFollowUps } from "./agenda";
import {
  calendarPlatform,
  calendarSourceType,
  ensureCalendarPermission,
  ensureDhagaCalendar,
  readDeviceEvents,
} from "./device";
import { loadCalendarLinks, saveCalendarLinks } from "./links";
import { linksAfterWrites, planCalendarWrites } from "./plan";
import { calendarNotice } from "./target";
import { applyCalendarPlan } from "./write";

import type { MobileSettings } from "@/types";
import type {
  CalendarLoad,
  CalendarOutcome,
  CalendarPhaseHandler,
  FollowUpSummary,
} from "./types";

/**
 * One run, either direction. device.ts / write.ts are the native I/O;
 * agenda.ts, plan.ts and target.ts hold the decisions and are unit tested; this
 * file only sequences them. Nothing here runs until the user opens the screen
 * or taps the button — no background job, no silent write.
 */

/** The window the agenda covers, anchored on now. */
function agendaRange(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setDate(from.getDate() - AGENDA_DAYS_BACK);
  const to = new Date(now);
  to.setDate(to.getDate() + AGENDA_DAYS_AHEAD);
  return { from, to };
}

/**
 * One screen load: permission → this phone's events → Dhaga's follow-ups.
 *
 * The follow-up fetch is deliberately allowed to fail on its own. Until
 * GET /api/follow-ups exists (see FOLLOW_UPS_PATH) it always will, and the
 * device agenda is still worth showing — so its error is carried on the view
 * rather than thrown, and the user sees their real events plus a plain sentence
 * about what is missing.
 *
 * The Dhaga calendar is NOT created here. Reading the screen must not add a
 * calendar to someone's phone; that happens on the first write-out, when they
 * have asked for it.
 */
export async function loadCalendarView(
  settings: MobileSettings,
  onPhase: CalendarPhaseHandler,
  now: Date = new Date(),
): Promise<CalendarLoad> {
  try {
    onPhase("permission");
    const permission = await ensureCalendarPermission();
    if (!permission.granted) return { kind: "denied", canAskAgain: permission.canAskAgain };

    onPhase("reading");
    const { from, to } = agendaRange(now);
    const { events, dhagaCalendarId } = await readDeviceEvents(from, to);

    onPhase("fetching");
    let followUps: FollowUpSummary[] = [];
    let followUpError: string | null = null;
    try {
      followUps = await fetchFollowUps(settings);
    } catch (error) {
      followUpError = messageFor(error, "Couldn't load your follow-ups.");
    }

    return {
      kind: "ready",
      view: {
        agenda: buildAgenda(events, followUps, dhagaCalendarId, now),
        unscheduled: unscheduledFollowUps(followUps),
        followUps,
        dhagaCalendarId,
        followUpError,
      },
    };
  } catch (error) {
    return { kind: "error", message: messageFor(error, "Couldn't read this phone's calendar.") };
  }
}

/**
 * Write-out: bring the Dhaga calendar in line with `followUps`, creating the
 * calendar on this phone if it is the first run.
 *
 * Deletion is as much the job as creation — a follow-up that was completed or
 * dismissed has its event removed here, and so does one that was deleted
 * outright (planCalendarWrites decides both). Nothing outside the Dhaga
 * calendar is ever touched.
 */
export async function writeFollowUpsToDevice(
  followUps: FollowUpSummary[],
  onPhase: CalendarPhaseHandler,
): Promise<CalendarOutcome> {
  try {
    onPhase("permission");
    const permission = await ensureCalendarPermission();
    if (!permission.granted) return { kind: "denied", canAskAgain: permission.canAskAgain };

    onPhase("writing");
    const calendar = await ensureDhagaCalendar();
    const links = await loadCalendarLinks();
    const applied = await applyCalendarPlan(calendar, planCalendarWrites(followUps, links));
    saveCalendarLinks(linksAfterWrites(links, applied.created, applied.removed));

    return {
      kind: "done",
      result: {
        created: applied.createdCount,
        updated: applied.updatedCount,
        removed: applied.removed.length,
        failed: applied.failed,
        notice: calendarNotice(calendarPlatform(), calendarSourceType(calendar)),
      },
    };
  } catch (error) {
    return { kind: "error", message: messageFor(error, "Couldn't write to this phone's calendar.") };
  }
}

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof CaptureError || error instanceof Error) return error.message;
  return fallback;
}
