"use client";

import type { ReactElement } from "react";
import type { EventContentArg } from "@fullcalendar/core";
import {
  importantDateNote,
  isExternalEventProps,
  isImportantDateEventProps,
  type CalendarEventProps,
} from "./event-map";

/**
 * FullCalendar's `eventContent` for every kind of chip on the board, in both
 * views. A follow-up shows who it is about plus the action; a connected-calendar
 * event shows its own title (with the start time when it is not all-day) plus
 * its location; an important date reads "Priya — Birthday" with the age on a
 * quiet second line. Which one we are looking at is decided by the extendedProps
 * discriminator, never by inspecting the shape with `any`.
 *
 * Every chip is two single-line rows that ellipsise (see calendar-theme.css), so
 * a 48px-wide month cell at 375px truncates rather than reflowing — and under
 * 768px the board opens in listWeek anyway, where the full title has room.
 *
 * Connected-calendar titles and locations are third-party PII: they render here
 * and nowhere else — no tooltip, no log, no analytics.
 */
export function renderEventContent(arg: EventContentArg): ReactElement {
  const props = arg.event.extendedProps as CalendarEventProps;

  if (isImportantDateEventProps(props)) {
    const note = importantDateNote(props);
    return (
      <div className="fc-important-date-body">
        <span className="fc-important-date-title">{arg.event.title}</span>
        {note ? <span className="fc-important-date-meta">{note}</span> : null}
      </div>
    );
  }

  if (isExternalEventProps(props)) {
    return (
      <div className="fc-external-body">
        <span className="fc-external-title">
          {arg.timeText ? `${arg.timeText} · ` : ""}
          {arg.event.title}
        </span>
        {props.location ? <span className="fc-external-meta">{props.location}</span> : null}
      </div>
    );
  }

  return (
    <div className="fc-followup">
      <span className="fc-followup-name">{arg.event.title}</span>
      {props.action ? <span className="fc-followup-action">{props.action}</span> : null}
    </div>
  );
}
