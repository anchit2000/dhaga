"use client";

import { CalendarClock } from "lucide-react";
import { AddToCalendar } from "../AddToCalendar";
import { BUCKET_LABEL } from "./labels";
import { Button } from "@/components/ui/button";
import { formatWeekdayTime } from "@/utils/format-date";
import type { ReactElement } from "react";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

export interface MeetingSlot {
  start: Date;
  end: Date;
}

/**
 * One person on today's list: who they are, why they surfaced, and the two things
 * you can do about it. The reason line is `line-clamp-2`, not `truncate` — a
 * seven-bucket list produces labels and reasons ("Follow-up · Follow-up overdue
 * 4 days") that clip mid-sentence on one line at 375px, and the reason is the
 * whole justification for the row.
 */
export function SuggestionRow({
  person,
  calendarConnected,
  slots,
  expanded,
  onToggleSchedule,
  onSelect,
  onReachedOut,
}: {
  person: DailySuggestion;
  calendarConnected: boolean;
  slots: MeetingSlot[];
  expanded: boolean;
  onToggleSchedule: () => void;
  onSelect: () => void;
  onReachedOut: () => void;
}): ReactElement {
  return (
    <div className="rounded-lg py-3 transition-colors first:pt-0 last:pb-0 hover:bg-amber/[0.03]">
      <div className="flex items-center gap-3">
        <Button
          render={<div />}
          variant="ghost"
          onClick={onSelect}
          className="block h-auto min-w-0 flex-1 rounded-lg p-0 text-left text-sm font-normal normal-case hover:bg-transparent"
        >
          <span className="block truncate text-sm font-medium text-paper">{person.name}</span>
          <span className="line-clamp-2 text-xs text-fog">
            <span className="font-mono uppercase tracking-wider text-ember">
              {BUCKET_LABEL[person.bucket]}
            </span>{" "}
            · {person.reason}
          </span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onReachedOut}>
          Reached out
        </Button>
      </div>
      {calendarConnected && slots.length > 0 ? (
        <div className="mt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1.5 px-0 text-xs text-ember hover:bg-transparent hover:underline"
            onClick={onToggleSchedule}
          >
            <CalendarClock className="size-3.5" /> Find a time
          </Button>
          {expanded ? (
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
  );
}
