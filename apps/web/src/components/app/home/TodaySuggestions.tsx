"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { AddToCalendar } from "./AddToCalendar";
import { Button } from "@/components/ui/button";
import { markReachedOutAction } from "@/lib/actions/reminders";
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

function slotLabel(slot: MeetingSlot): string {
  return formatWeekdayTime(slot.start);
}

export function TodaySuggestions({
  suggestions,
  calendarConnected,
  slots,
  overloaded,
  meetingCountToday,
  moreDue,
  onSelectContact,
}: {
  suggestions: DailySuggestion[];
  calendarConnected: boolean;
  slots: MeetingSlot[];
  overloaded: boolean;
  meetingCountToday: number;
  moreDue: number;
  onSelectContact: (id: string) => void;
}) {
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-lg">Today</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-fog">
          {suggestions.length} {suggestions.length === 1 ? "person" : "people"}
        </span>
      </div>

      {overloaded ? (
        <div className="rounded-xl border border-amber/25 bg-amber/[0.05] px-4 py-3">
          <p className="text-sm text-paper">You have {meetingCountToday} meetings today.</p>
          <p className="mt-0.5 text-xs text-fog">A lighter day might be better — these can wait for tomorrow.</p>
        </div>
      ) : null}

      {suggestions.length === 0 ? (
        <div className="rounded-xl border border-seam bg-panel px-4 py-3">
          <p className="text-sm text-paper">No one to reach out to today.</p>
          <p className="mt-0.5 text-xs text-fog">
            Set a keep-in-touch cadence on a contact and they&apos;ll surface here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((person) => (
            <div key={person.contactId} className="rounded-xl border border-amber/25 bg-amber/[0.05] px-3 py-2.5">
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
                <form action={markReachedOutAction}>
                  <input type="hidden" name="contactId" value={person.contactId} />
                  <Button type="submit" variant="outline" size="sm">
                    Reached out
                  </Button>
                </form>
              </div>
              {calendarConnected && slots.length > 0 ? (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1.5 px-0 text-xs text-amber hover:bg-transparent hover:underline"
                    onClick={() => setSchedulingId(schedulingId === person.contactId ? null : person.contactId)}
                  >
                    <CalendarClock className="size-3.5" /> Find a time
                  </Button>
                  {schedulingId === person.contactId ? (
                    <div className="mt-2 space-y-2 border-t border-seam pt-2">
                      {slots.map((slot) => (
                        <div key={slot.start.getTime()} className="flex flex-wrap items-center gap-2">
                          <span className="min-w-24 text-xs text-paper">{slotLabel(slot)}</span>
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
        <Link href="/app/settings" className="block text-xs text-amber hover:underline">
          Connect a calendar to get meeting-time suggestions →
        </Link>
      ) : null}
      {moreDue > 0 ? (
        <Link href="/app/people" className="block text-xs text-fog hover:text-paper">
          +{moreDue} more due this week → all people
        </Link>
      ) : null}
    </section>
  );
}
