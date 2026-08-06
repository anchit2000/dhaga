"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";
import {
  isFollowUpEventProps,
  isImportantDateEventProps,
  reconcileResolvedFollowUpEvent,
  toCalendarEvents,
  toExternalCalendarEvents,
  toImportantDateEvents,
  type CalendarEventProps,
} from "./event-map";
import { renderEventContent } from "./event-content";
import { CalendarCaption } from "./CalendarCaption";
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
 * Full-screen follow-up calendar. FullCalendar mounts client-only. Drag a dated
 * event or a tray chip onto the grid to reschedule it (useReschedule owns
 * both paths and the tray's live list). Clicking opens the details dialog. The
 * events array is a stable useMemo so imperative changes (event.remove(),
 * received events) are never clobbered by a React re-render.
 * `externalEvents` are read-only context from a CONNECTED calendar, merged onto
 * the same grid: they cannot be dragged (editable:false per event, plus the
 * guard in useReschedule) and clicking one opens nothing, because Dhaga owns no
 * record. `importantDates` are recurring birthday/anniversary occurrences DERIVED
 * from contacts — also read-only, but a click opens the contact for editing.
 */
export function CalendarBoard({
  items,
  externalEvents,
  importantDates,
}: {
  items: CalendarFollowUp[];
  externalEvents: ExternalCalendarEvent[];
  importantDates: UpcomingImportantDate[];
}) {
  const calendarRef = useRef<FullCalendar>(null);
  const router = useRouter();
  const events = useMemo(
    () => [
      ...toCalendarEvents(items),
      ...toImportantDateEvents(importantDates),
      ...toExternalCalendarEvents(externalEvents),
    ],
    [items, externalEvents, importantDates],
  );
  const { trayItems, handleEventDrop, handleEventReceive } = useReschedule(items);
  const [selected, setSelected] = useState<SelectedFollowUp | null>(null);
  const initialView = useCalendarInitialView();

  function resolveEvent(id: string, advancedTo: string | null): void {
    reconcileResolvedFollowUpEvent(calendarRef.current?.getApi().getEventById(id) ?? null, advancedTo);
  }

  function handleEventClick(arg: EventClickArg): void {
    const props = arg.event.extendedProps as CalendarEventProps;
    if (isImportantDateEventProps(props)) {
      // Derived from the contact, with no record of its own to complete or
      // reschedule — the contact page is the only honest destination, and it is
      // where the date is edited.
      router.push(`/app/people/${props.contactId}`);
      return;
    }
    // Anything that is not a follow-up has no Dhaga record to complete, dismiss
    // or reschedule — the details dialog would be lying. It stays inert.
    if (!isFollowUpEventProps(props)) return;
    setSelected({
      id: arg.event.id,
      contactId: props.contactId,
      contactName: props.contactName,
      companyId: props.companyId,
      companyName: props.companyName,
      associationLabel: props.associationLabel,
      action: props.action,
      dueDate: props.dueDate,
    });
  }

  // Only when there is nothing at all: a connected calendar with events — or a
  // single stored birthday — is reason to render the grid before the first
  // follow-up exists.
  if (items.length === 0 && externalEvents.length === 0 && importantDates.length === 0) {
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
            // Follow-ups (rank 0) → important dates (1) → connected-calendar
            // events (2), so a busy day never buries Dhaga's own work behind
            // "+N more".
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
      <CalendarCaption
        hasExternal={externalEvents.length > 0}
        hasImportantDates={importantDates.length > 0}
      />
      <EventDetailsDialog
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onResolved={resolveEvent}
      />
    </div>
  );
}
