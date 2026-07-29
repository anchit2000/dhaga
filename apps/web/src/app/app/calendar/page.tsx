import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCalendarFollowUps } from "@/lib/repo/reminders";
import { getExternalCalendarEvents } from "@/lib/repo/calendar";
import { EXTERNAL_EVENT_WINDOW_MONTHS } from "@/utils/constants/calendar";
import { CalendarBoard } from "@/components/app/calendar";

export const metadata = { title: "Calendar — Dhaga" };

/** Full-screen calendar of every open follow-up. Dated ones land on the grid;
 *  date-less ones sit in the draggable Unscheduled tray (both in CalendarBoard).
 *  Events from an UPGRADED connected calendar ride alongside them as read-only
 *  context (getExternalCalendarEvents returns [] for everyone else).
 *  Server-fetches both; all interaction is client-side. */
export default async function CalendarPage() {
  await requireUserIdForPage();
  // SEQUENTIAL, never Promise.all: fanning reads out concurrently checks out a
  // second tenant connection and exhausts the max-3 pool — the exact failure
  // this codebase has shipped more than once.
  const items = await getCalendarFollowUps();
  const today = new Date();
  const externalEvents = await getExternalCalendarEvents({
    // Month-aligned so every month the grid can page to within the window is
    // covered whole, rather than half-populated at the edges.
    from: startOfMonth(subMonths(today, EXTERNAL_EVENT_WINDOW_MONTHS.back)),
    to: endOfMonth(addMonths(today, EXTERNAL_EVENT_WINDOW_MONTHS.forward)),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">Calendar</h1>
        {items.length > 0 ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
            {items.length} {items.length === 1 ? "follow-up" : "follow-ups"}
          </span>
        ) : null}
      </div>
      <CalendarBoard items={items} externalEvents={externalEvents} />
    </div>
  );
}
