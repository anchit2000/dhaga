"use client";

import { buildAddToCalendarLinks, buildIcs } from "@dhaga/core/src/calendar/ics";
import { Button } from "@/components/ui/button";

/**
 * "Propose + hand off" booking — we never write to the user's calendar. The
 * pure ics builders are deep-imported so the client bundle never pulls the
 * OAuth providers or any server-only code from @dhaga/core.
 */
export function AddToCalendar({ title, start, end }: { title: string; start: Date; end: Date }) {
  const links = buildAddToCalendarLinks({ title, start, end });
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    buildIcs({ uid: `${start.getTime()}-dhaga`, title, start, end }),
  )}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Button render={<a href={links.google} target="_blank" rel="noreferrer" />} variant="outline" size="sm">
        Google
      </Button>
      <Button render={<a href={links.outlook} target="_blank" rel="noreferrer" />} variant="outline" size="sm">
        Outlook
      </Button>
      <Button render={<a href={ics} download="dhaga-meeting.ics" />} variant="outline" size="sm">
        .ics
      </Button>
    </div>
  );
}
