import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCalendarFollowUps } from "@/lib/repo/reminders";
import { CalendarBoard } from "@/components/app/calendar";

export const metadata = { title: "Calendar — Dhaga" };

/** Full-screen calendar of every open follow-up. Dated ones land on the grid;
 *  date-less ones sit in the draggable Unscheduled tray (both in CalendarBoard).
 *  Server-fetches the scoped follow-ups; all interaction is client-side. */
export default async function CalendarPage() {
  await requireUserIdForPage();
  const items = await getCalendarFollowUps();

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
      <CalendarBoard items={items} />
    </div>
  );
}
