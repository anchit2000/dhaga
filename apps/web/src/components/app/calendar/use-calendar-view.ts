"use client";

import { useSyncExternalStore } from "react";

export type CalendarView = "dayGridMonth" | "listWeek";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot(): CalendarView {
  return window.matchMedia(MOBILE_QUERY).matches ? "listWeek" : "dayGridMonth";
}

/** Null on the server + during hydration, so FullCalendar never renders (nor
 *  touches `window`) until the client takes over. */
function getServerSnapshot(): null {
  return null;
}

/**
 * Resolves FullCalendar's initial view responsively — `listWeek` under 768px,
 * `dayGridMonth` above — and doubles as the CLIENT-ONLY mount guard: `null`
 * until the client commits (see getServerSnapshot). Built on useSyncExternalStore
 * so there's no setState-in-effect; the board renders the calendar only once this
 * is non-null, so the view is correct on FullCalendar's one-time init.
 */
export function useCalendarInitialView(): CalendarView | null {
  return useSyncExternalStore<CalendarView | null>(subscribe, getSnapshot, getServerSnapshot);
}
