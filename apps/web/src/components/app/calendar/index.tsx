"use client";

import { useMemo, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin, { type EventReceiveArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";
import { rescheduleFollowUpAction } from "@/lib/actions/follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import { toCalendarEvents, unscheduledFollowUps, type FollowUpEventProps } from "./event-map";
import { useCalendarInitialView } from "./use-calendar-view";
import { UnscheduledTray } from "./UnscheduledTray";
import { EventDetailsDialog, type SelectedFollowUp } from "./EventDetailsDialog";
import "./calendar-theme.css";

const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,listWeek",
} as const;

function renderEventContent(arg: EventContentArg): ReactElement {
  const props = arg.event.extendedProps as FollowUpEventProps;
  return (
    <div className="fc-followup">
      <span className="fc-followup-name">{arg.event.title}</span>
      {props.action ? <span className="fc-followup-action">{props.action}</span> : null}
    </div>
  );
}

/**
 * Full-screen follow-up calendar. Renders client-only (useCalendarInitialView is
 * null until mounted, so FullCalendar never touches `window` during SSR). Drag a
 * dated event (eventDrop) or a tray chip onto the grid (eventReceive) to
 * reschedule: FullCalendar moves it optimistically and we call
 * rescheduleFollowUpAction, reverting on any non-success. Clicking opens the
 * details dialog. The events array is a stable useMemo so imperative changes
 * (event.remove(), received events) are never clobbered by a React re-render.
 */
export function CalendarBoard({ items }: { items: CalendarFollowUp[] }) {
  const calendarRef = useRef<FullCalendar>(null);
  const events = useMemo(() => toCalendarEvents(items), [items]);
  const [trayItems, setTrayItems] = useState<CalendarFollowUp[]>(() =>
    unscheduledFollowUps(items),
  );
  const [selected, setSelected] = useState<SelectedFollowUp | null>(null);
  const initialView = useCalendarInitialView();

  function removeEvent(id: string): void {
    calendarRef.current?.getApi().getEventById(id)?.remove();
  }

  async function handleEventDrop(arg: EventDropArg): Promise<void> {
    const r = await rescheduleFollowUpAction({ id: arg.event.id, dueDate: arg.event.startStr });
    if (r.ok) toast.success("Follow-up rescheduled.");
    else {
      arg.revert();
      toast.error(r.error);
    }
  }

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

  function handleEventClick(arg: EventClickArg): void {
    const props = arg.event.extendedProps as FollowUpEventProps;
    setSelected({
      id: arg.event.id,
      contactId: props.contactId,
      contactName: props.contactName,
      action: props.action,
      dueDate: arg.event.startStr || null,
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing on the calendar"
        body="Follow-ups with a due date land here — capture a contact and add one to get started."
      >
        <Button render={<Link href="/app/quick-add" />}>Quick add a contact</Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {trayItems.length > 0 ? <UnscheduledTray items={trayItems} /> : null}
      <div className="dhaga-calendar rounded-2xl border border-seam bg-panel/40 p-2 sm:p-4">
        {initialView ? (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={HEADER_TOOLBAR}
            events={events}
            height="auto"
            dayMaxEvents={3}
            longPressDelay={200}
            editable
            eventStartEditable
            eventDurationEditable={false}
            droppable
            eventContent={renderEventContent}
            eventDrop={handleEventDrop}
            eventReceive={handleEventReceive}
            eventClick={handleEventClick}
          />
        ) : (
          <div className="h-[60vh] animate-pulse rounded-xl bg-panel/60" aria-hidden />
        )}
      </div>
      <EventDetailsDialog
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onResolved={removeEvent}
      />
    </div>
  );
}
