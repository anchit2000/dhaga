"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { AddToCalendar } from "./AddToCalendar";
import { HomeTile } from "./HomeTile";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { Button } from "@/components/ui/button";
import { markReachedOutAction } from "@/lib/actions/reminders";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { formatWeekdayTime } from "@/utils/format-date";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

export interface MeetingSlot {
  start: Date;
  end: Date;
}

const BUCKET_LABEL: Record<DailySuggestion["bucket"], string> = {
  daily: "Check-in",
  cadence: "Due",
  graph: "Network",
};

/** Home's hero tile: the curated reach-out list for today. */
export function TodaySuggestions({
  suggestions,
  calendarConnected,
  slots,
  overloaded,
  meetingCountToday,
  moreDue,
  onSelectContact,
  className,
}: {
  suggestions: DailySuggestion[];
  calendarConnected: boolean;
  slots: MeetingSlot[];
  overloaded: boolean;
  meetingCountToday: number;
  moreDue: number;
  onSelectContact: (id: string) => void;
  /** Grid-span classes — HomeDashboard sizes Today's hero column. */
  className?: string;
}) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  // Marking someone reached out drops them from today's list instantly; the row
  // reappears with a Retry toast if the server rejects it.
  const { items, remove } = useOptimisticList<DailySuggestion>({
    items: suggestions,
    errorMessage: "Couldn't mark that as reached out.",
  });

  return (
    <HomeTile
      title="Today"
      viewAll={{ href: "/app/people", label: moreDue > 0 ? `+${moreDue} more due this week` : "View all people" }}
      tone="amber"
      data-tour="updates"
      className={className}
      meta={
        <span className="font-mono text-[10px] uppercase tracking-widest text-fog">
          {items.length} {items.length === 1 ? "person" : "people"}
        </span>
      }
    >
      {overloaded ? (
        <div className="rounded-xl bg-amber/[0.06] px-3 py-2.5">
          <p className="text-sm text-paper">You have {meetingCountToday} meetings today.</p>
          <p className="mt-0.5 text-xs text-fog">A lighter day might be better — these can wait for tomorrow.</p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <ThreadMark size={44} />
          <div>
            <p className="text-sm text-paper">No one to reach out to today.</p>
            <p className="mx-auto mt-1 max-w-64 text-xs leading-relaxed text-fog">
              Capture people as you meet them, set a keep-in-touch cadence, and they&apos;ll surface here.
            </p>
          </div>
          <Button render={<Link href="/app/quick-add" />} variant="outline" size="sm">
            Capture someone
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-seam">
          {items.map((person) => (
            <div key={person.contactId} className="rounded-lg py-3 transition-colors first:pt-0 last:pb-0 hover:bg-amber/[0.03]">
              <div className="flex items-center gap-3">
                <Button
                  render={<div />}
                  variant="ghost"
                  onClick={() => onSelectContact(person.contactId)}
                  className="block h-auto min-w-0 flex-1 rounded-lg p-0 text-left text-sm font-normal normal-case hover:bg-transparent"
                >
                  <span className="block truncate text-sm font-medium text-paper">{person.name}</span>
                  <span className="block truncate text-xs text-fog">
                    <span className="font-mono uppercase tracking-wider text-ember">
                      {BUCKET_LABEL[person.bucket]}
                    </span>{" "}
                    · {person.reason}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    remove(person, async () => {
                      const formData = new FormData();
                      formData.set("contactId", person.contactId);
                      await markReachedOutAction(formData);
                      return null;
                    })
                  }
                >
                  Reached out
                </Button>
              </div>
              {calendarConnected && slots.length > 0 ? (
                <div className="mt-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1.5 px-0 text-xs text-ember hover:bg-transparent hover:underline"
                    onClick={() => setSchedulingId(schedulingId === person.contactId ? null : person.contactId)}
                  >
                    <CalendarClock className="size-3.5" /> Find a time
                  </Button>
                  {schedulingId === person.contactId ? (
                    <div className="mt-2 space-y-2 border-t border-seam pt-2">
                      {slots.map((slot) => (
                        <div key={slot.start.getTime()} className="flex flex-wrap items-center gap-2">
                          <span className="min-w-24 text-xs text-paper">{formatWeekdayTime(slot.start)}</span>
                          <AddToCalendar title={`Meet ${person.name}`} start={slot.start} end={slot.end} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!calendarConnected ? (
        <div className="mt-auto space-y-1.5 pt-1">
          {!calendarConnected ? (
            <Link href="/app/settings" className="block text-xs text-ember hover:underline">
              Connect a calendar to get meeting-time suggestions →
            </Link>
          ) : null}
        </div>
      ) : null}
    </HomeTile>
  );
}
