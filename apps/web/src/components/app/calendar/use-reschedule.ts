"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { EventDropArg } from "@fullcalendar/core";
import type { EventReceiveArg } from "@fullcalendar/interaction";
import { rescheduleFollowUpAction } from "@/lib/actions/follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import { isFollowUpEventProps, unscheduledFollowUps, type CalendarEventProps } from "./event-map";

export type Reschedule = {
  /** The date-less follow-ups still awaiting a date, for the Unscheduled tray. */
  trayItems: CalendarFollowUp[];
  handleEventDrop: (arg: EventDropArg) => Promise<void>;
  handleEventReceive: (arg: EventReceiveArg) => Promise<void>;
};

/**
 * Drag-to-reschedule, plus the live list behind the Unscheduled tray — one
 * concern, because dropping a tray chip on the grid (eventReceive) both persists
 * a due date and empties that chip out of the tray, while dragging an already
 * dated event to a new cell (eventDrop) persists the same way. FullCalendar has
 * already moved the event optimistically by the time either fires, so every
 * failure path calls arg.revert().
 */
export function useReschedule(items: CalendarFollowUp[]): Reschedule {
  const [trayItems, setTrayItems] = useState<CalendarFollowUp[]>(() => unscheduledFollowUps(items));

  async function handleEventDrop(arg: EventDropArg): Promise<void> {
    // Belt and braces: connected-calendar events and derived important dates
    // already ship editable:false, so no drag can start on either — if that ever
    // regresses, this must not write. The gate is POSITIVE (follow-up or bail)
    // rather than a blacklist, because `arg.event.id` is only a follow-up id for
    // that one kind: an important date's id is a synthetic occurrence key built
    // around a CONTACT id, and handing that to rescheduleFollowUpAction would at
    // best fail and at worst re-date an unrelated row.
    if (!isFollowUpEventProps(arg.event.extendedProps as CalendarEventProps)) {
      arg.revert();
      return;
    }
    const r = await rescheduleFollowUpAction({ id: arg.event.id, dueDate: arg.event.startStr });
    if (r.ok) toast.success("Follow-up rescheduled.");
    else {
      arg.revert();
      toast.error(r.error);
    }
  }

  // Only the tray's own chips can be received: it is the sole external Draggable
  // on the page, and it carries follow-up ids exclusively.
  async function handleEventReceive(arg: EventReceiveArg): Promise<void> {
    const id = arg.event.id;
    const r = await rescheduleFollowUpAction({ id, dueDate: arg.event.startStr });
    if (r.ok) {
      setTrayItems((prev) => prev.filter((t) => t.id !== id));
      toast.success("Follow-up scheduled.");
    } else {
      arg.revert();
      toast.error(r.error);
    }
  }

  return { trayItems, handleEventDrop, handleEventReceive };
}
