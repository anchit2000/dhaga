import { UNTITLED_DEVICE_EVENT } from "@/utils/constants/calendar";

import type { AgendaDay, AgendaItem, DeviceEvent, FollowUpSummary } from "./types";

/**
 * Merging this phone's real events with Dhaga's follow-ups into one agenda.
 * Pure — no native module — so the ordering and grouping rules below are unit
 * tested rather than eyeballed on a device.
 */

/** YYYY-MM-DD in the phone's own timezone. */
export function localDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight tonight-past, local — the boundary an overdue follow-up is before. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The day a follow-up belongs on: the UTC date part of its due date, exactly as
 * the web board pins one (see toCalendarEvents). Due dates are stored as
 * UTC-midnight instants, and reading one in a negative-offset timezone would
 * land the follow-up a day early — so the date part is taken, never the local
 * calendar day.
 */
function followUpDayKey(dueDate: string): string {
  return dueDate.slice(0, 10);
}

/**
 * Follow-ups the agenda can place: open, dated, and parseable. Everything else
 * is returned by `unscheduledFollowUps` instead of being silently dropped —
 * an undated follow-up is real work, it just has no cell to sit in.
 */
function isScheduled(followUp: FollowUpSummary): followUp is FollowUpSummary & { dueDate: string } {
  return followUp.status === "open" && followUp.dueDate !== null;
}

/** Open follow-ups with no due date — the mobile echo of web's Unscheduled tray. */
export function unscheduledFollowUps(followUps: FollowUpSummary[]): FollowUpSummary[] {
  return followUps.filter((followUp) => followUp.status === "open" && followUp.dueDate === null);
}

/**
 * One agenda, day by day, ascending.
 *
 * `dhagaCalendarId` is excluded on purpose: those events ARE the follow-ups,
 * written out by this same feature. Including them would show every follow-up
 * twice — once as Dhaga's own row and once as a device event — and the
 * duplicate would appear only after a sync, which is the worst possible time to
 * discover it.
 *
 * `now` is injected rather than read from the clock so "overdue" is testable.
 */
export function buildAgenda(
  events: DeviceEvent[],
  followUps: FollowUpSummary[],
  dhagaCalendarId: string | null,
  now: Date,
): AgendaDay[] {
  const days = new Map<string, AgendaItem[]>();
  const push = (key: string, item: AgendaItem): void => {
    const existing = days.get(key);
    if (existing) existing.push(item);
    else days.set(key, [item]);
  };

  for (const event of events) {
    if (dhagaCalendarId !== null && event.calendarId === dhagaCalendarId) continue;
    push(localDayKey(event.start), {
      kind: "event",
      id: event.id,
      title: event.title.trim() || UNTITLED_DEVICE_EVENT,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
    });
  }

  const today = startOfLocalDay(now);
  for (const followUp of followUps) {
    if (!isScheduled(followUp)) continue;
    const due = new Date(followUp.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    push(followUpDayKey(followUp.dueDate), {
      kind: "followUp",
      id: followUp.id,
      contactName: followUp.contactName,
      action: followUp.action,
      dueHint: followUp.dueHint,
      overdue: due.getTime() < today.getTime(),
    });
  }

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({ key, date: dateFromKey(key), items: items.sort(byAgendaOrder) }));
}

/**
 * Follow-ups first, then all-day events, then timed events by start.
 *
 * Dhaga's own work leads the day for the same reason it does on the web board:
 * a phone screen shows a handful of rows, and the item the user opened the app
 * to act on must not be pushed below a wall of meetings.
 */
function byAgendaOrder(a: AgendaItem, b: AgendaItem): number {
  const rank = (item: AgendaItem): number =>
    item.kind === "followUp" ? 0 : item.allDay ? 1 : 2;
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  if (a.kind === "event" && b.kind === "event") return a.start.getTime() - b.start.getTime();
  return 0;
}

/** Local midnight of a YYYY-MM-DD key, for the day header's date formatting. */
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
