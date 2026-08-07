"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import type { EventReceiveArg } from "@fullcalendar/interaction";
import { renderEventContent } from "./event-content";
import { useCalendarInitialView } from "./use-calendar-view";

const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,listWeek",
} as const;

/**
 * The FullCalendar surface itself — split out per the 150-line rule so
 * CalendarBoard stays about state (the follow-up list, the filters, the dialog)
 * and this stays about rendering. Mounts client-only, and renders a skeleton
 * until `useCalendarInitialView` has decided between month and list, which
 * depends on viewport width.
 */
export function CalendarGrid({
  events,
  onEventDrop,
  onEventReceive,
  onEventClick,
}: {
  events: EventInput[];
  onEventDrop: (arg: EventDropArg) => Promise<void>;
  onEventReceive: (arg: EventReceiveArg) => Promise<void>;
  onEventClick: (arg: EventClickArg) => void;
}): React.ReactElement {
  const initialView = useCalendarInitialView();

  return (
    <div className="dhaga-calendar rounded-2xl border border-seam bg-panel/40 p-2 sm:p-4">
      {initialView ? (
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={HEADER_TOOLBAR}
          events={events}
          height="auto"
          dayMaxEvents={3}
          // Follow-ups (rank 0) → important dates (1) → connected-calendar events
          // (2), so a busy day never buries Dhaga's own work behind "+N more".
          eventOrder="rank,start,-duration,allDay,title"
          longPressDelay={200}
          editable
          eventStartEditable
          eventDurationEditable={false}
          droppable
          eventContent={renderEventContent}
          eventDrop={onEventDrop}
          eventReceive={onEventReceive}
          eventClick={onEventClick}
        />
      ) : (
        <div className="h-[60vh] animate-pulse rounded-xl bg-panel/60" aria-hidden />
      )}
    </div>
  );
}
