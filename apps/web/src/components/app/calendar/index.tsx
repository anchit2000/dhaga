"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";
import {
  isExternalEventProps,
  toCalendarEvents,
  toExternalCalendarEvents,
  type CalendarEventProps,
} from "./event-map";
import { renderEventContent } from "./event-content";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { useCalendarInitialView } from "./use-calendar-view";
import { useReschedule } from "./use-reschedule";
import { UnscheduledTray } from "./UnscheduledTray";
import { EventDetailsDialog, type SelectedFollowUp } from "./EventDetailsDialog";
import "./calendar-theme.css";

const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,listWeek",
} as const;

/**
 * Full-screen follow-up calendar. Renders client-only (useCalendarInitialView is
 * null until mounted, so FullCalendar never touches `window` during SSR). Drag a
 * dated event or a tray chip onto the grid to reschedule it (useReschedule owns
 * both paths and the tray's live list). Clicking opens the details dialog. The
 * events array is a stable useMemo so imperative changes (event.remove(),
 * received events) are never clobbered by a React re-render.
 *
 * `externalEvents` are read-only context from a CONNECTED calendar, merged onto
 * the same grid: they cannot be dragged (editable:false per event, plus the
 * guard in useReschedule) and clicking one opens nothing, because Dhaga owns no
 * record to act on. The caption under the grid says so in the UI.
 */
export function CalendarBoard({
  items,
  externalEvents,
}: {
  items: CalendarFollowUp[];
  externalEvents: ExternalCalendarEvent[];
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const events = useMemo(
    () => [...toCalendarEvents(items), ...toExternalCalendarEvents(externalEvents)],
    [items, externalEvents],
  );
  const { trayItems, handleEventDrop, handleEventReceive } = useReschedule(items);
  const [selected, setSelected] = useState<SelectedFollowUp | null>(null);
  const initialView = useCalendarInitialView();

  function removeEvent(id: string): void {
    calendarRef.current?.getApi().getEventById(id)?.remove();
  }

  function handleEventClick(arg: EventClickArg): void {
    const props = arg.event.extendedProps as CalendarEventProps;
    // A connected-calendar event has no Dhaga record to complete, dismiss or
    // reschedule — the details dialog would be lying. It stays inert.
    if (isExternalEventProps(props)) return;
    setSelected({
      id: arg.event.id,
      contactId: props.contactId,
      contactName: props.contactName,
      action: props.action,
      dueDate: arg.event.startStr || null,
    });
  }

  // Only when there is nothing at all: a connected calendar with events is a
  // reason to render the grid even before the first follow-up exists.
  if (items.length === 0 && externalEvents.length === 0) {
    return <CalendarEmptyState />;
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
            // Follow-ups first (rank 0) so a day busy with connected-calendar
            // events never buries Dhaga's own work behind "+N more".
            eventOrder="rank,start,-duration,allDay,title"
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
      {externalEvents.length > 0 ? (
        <p className="text-xs leading-relaxed text-fog">
          Muted entries come from your connected calendar and are read-only. Everything else is a
          Dhaga follow-up.
        </p>
      ) : null}
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
