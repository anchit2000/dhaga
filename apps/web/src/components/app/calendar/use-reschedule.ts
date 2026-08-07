"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { EventDropArg } from "@fullcalendar/core";
import type { EventReceiveArg } from "@fullcalendar/interaction";
import { rescheduleFollowUpAction } from "@/lib/actions/follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import {
  applyFollowUpDueDate,
  applyFollowUpOutcome,
  isFollowUpEventProps,
  type CalendarEventProps,
  type FollowUpOutcome,
} from "./event-map";

export type Reschedule = {
  /** THE board's follow-up list: the grid, the tray and the filters all read it. */
  followUps: CalendarFollowUp[];
  handleEventDrop: (arg: EventDropArg) => Promise<void>;
  handleEventReceive: (arg: EventReceiveArg) => Promise<void>;
  handleResolved: (id: string, outcome: FollowUpOutcome) => void;
};

/**
 * The board's live follow-up list plus every mutation that moves an item within
 * it — drag-to-reschedule, drag-out-of-the-tray, and mark-done/dismiss.
 *
 * It owns REACT STATE rather than poking FullCalendar's event store imperatively,
 * which the board did before filters existed. Once `events` is derived from a
 * filtered list, any imperative `event.remove()` is undone by the next keystroke;
 * and the Unscheduled tray has no grid event to poke at all. One list, one truth,
 * and the tray falls out of it (`unscheduledFollowUps`).
 *
 * FullCalendar has already moved the event optimistically by the time either drag
 * handler fires, so every failure path calls arg.revert().
 */
export function useReschedule(items: CalendarFollowUp[]): Reschedule {
  const [followUps, setFollowUps] = useState<CalendarFollowUp[]>(items);

  async function handleEventDrop(arg: EventDropArg): Promise<void> {
    // Belt and braces: connected-calendar events, derived important dates and
    // completed follow-ups all ship editable:false, so no drag can start on any
    // of them — if that ever regresses, this must not write. The gate is POSITIVE
    // (follow-up or bail) rather than a blacklist, because `arg.event.id` is only
    // a follow-up id for that one kind: an important date's id is a synthetic
    // occurrence key built around a CONTACT id, and handing that to
    // rescheduleFollowUpAction would at best fail and at worst re-date an
    // unrelated row.
    const props = arg.event.extendedProps as CalendarEventProps;
    if (!isFollowUpEventProps(props) || props.status !== "open") {
      arg.revert();
      return;
    }
    const dueDate = arg.event.startStr;
    const r = await rescheduleFollowUpAction({ id: arg.event.id, dueDate });
    if (r.ok) {
      setFollowUps((prev) => applyFollowUpDueDate(prev, arg.event.id, dueDate));
      toast.success("Follow-up rescheduled.");
    } else {
      arg.revert();
      toast.error(r.error);
    }
  }

  // Only the tray's own chips can be received: it is the sole external Draggable
  // on the page, and it carries follow-up ids exclusively. On success the
  // externally-created event is removed and the SAME item re-enters through the
  // state-derived `events` array, so there is exactly one event per id.
  async function handleEventReceive(arg: EventReceiveArg): Promise<void> {
    const id = arg.event.id;
    const dueDate = arg.event.startStr;
    const r = await rescheduleFollowUpAction({ id, dueDate });
    if (r.ok) {
      arg.event.remove();
      setFollowUps((prev) => applyFollowUpDueDate(prev, id, dueDate));
      toast.success("Follow-up scheduled.");
    } else {
      arg.revert();
      toast.error(r.error);
    }
  }

  function handleResolved(id: string, outcome: FollowUpOutcome): void {
    setFollowUps((prev) => applyFollowUpOutcome(prev, id, outcome));
  }

  return { followUps, handleEventDrop, handleEventReceive, handleResolved };
}
