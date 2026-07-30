import type { CalendarWriteEvent } from "@dhaga/core/src/calendar/types";

/**
 * Shapes the device-calendar feature works in.
 *
 * The calendar/event mirrors below (DeviceCalendar, DeviceEvent) are declared
 * here rather than imported from expo-calendar for the same reason
 * src/lib/sync/fields/types.ts declares its own contact record shape: they let
 * the pure logic — and its unit tests — run with no native module loaded. Each
 * is a structural SUBSET of the expo-calendar class it mirrors, so the adapter
 * that produces one is checked against the real type at the boundary.
 */

/** Which platform's calendar rules apply. Mirrors SyncPlatform in ../sync. */
export type CalendarPlatform = "ios" | "android" | "other";

/**
 * The follow-up wire contract now lives in @dhaga/core/src/api/follow-ups,
 * alongside sync.ts and capture.ts, next to the GET /api/follow-ups route that
 * serves it. Re-exported here so nothing else in this feature had to change.
 */
import type { FollowUpSummary } from "@dhaga/core/src/api/follow-ups";

export type { FollowUpStatus, FollowUpSummary, FollowUpsResponse } from "@dhaga/core/src/api/follow-ups";

/** The fields the Dhaga-calendar selection needs off a device calendar. */
export interface DeviceCalendar {
  id: string;
  title: string;
  allowsModifications: boolean;
  /** iOS/Android account that owns it; `type` decides whether writes leave the phone. */
  source: { name: string; type: string };
  /** Android only: the OS marks exactly one calendar per account primary. */
  isPrimary?: boolean;
}

/** The fields the agenda needs off a device event. */
export interface DeviceEvent {
  id: string;
  calendarId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

/** One row on the agenda: a real device event, or a Dhaga follow-up. */
export type AgendaItem =
  | { kind: "event"; id: string; title: string; start: Date; end: Date; allDay: boolean }
  | {
      kind: "followUp";
      id: string;
      contactName: string;
      action: string;
      dueHint: string | null;
      overdue: boolean;
    };

/** A day cell of the agenda. `key` is the local YYYY-MM-DD the items fall on. */
export interface AgendaDay {
  key: string;
  date: Date;
  items: AgendaItem[];
}

/** followUpId → the id of the event Dhaga wrote for it on the Dhaga calendar. */
export type CalendarLinks = Record<string, string>;

/**
 * What one write-out run must do to the Dhaga calendar. Deliberately three
 * lists rather than one "upsert": a delete is not an edge case here but the
 * whole point — completing or dismissing a follow-up has to take its event off
 * the calendar, and so does deleting the follow-up outright.
 */
export interface CalendarWritePlan {
  creates: { followUpId: string; event: CalendarWriteEvent }[];
  updates: { followUpId: string; eventId: string; event: CalendarWriteEvent }[];
  deletes: { followUpId: string; eventId: string }[];
}

/** Steps of a run, surfaced to the user (CALENDAR_PHASE_LABELS). */
export type CalendarPhase = "permission" | "reading" | "fetching" | "writing";

/** How the engine reports where it has got to, as in ../sync/engine/types.ts. */
export type CalendarPhaseHandler = (phase: CalendarPhase) => void;

/** Everything the calendar screen renders from one load. */
export interface CalendarView {
  agenda: AgendaDay[];
  /** Open follow-ups with no due date — real work with no cell to sit in. */
  unscheduled: FollowUpSummary[];
  /** Raw follow-ups, handed to the write-out so it need not refetch them. */
  followUps: FollowUpSummary[];
  /** The Dhaga calendar's id once it exists, so the agenda can exclude it. */
  dhagaCalendarId: string | null;
  /**
   * Why the follow-up half of the screen is empty, when it is. Kept separate
   * from a run-level error on purpose: the device events loaded fine, and
   * blanking the whole screen over a server problem would hide them.
   */
  followUpError: string | null;
}

/** Loading the screen, with the same denied-vs-error split as CalendarOutcome. */
export type CalendarLoad =
  | { kind: "ready"; view: CalendarView }
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "error"; message: string };

/** Counts from one write-out run, reported rather than silently swallowed. */
export interface CalendarWriteResult {
  created: number;
  updated: number;
  removed: number;
  /** Writes the OS rejected. Non-zero means the run did less than it claims. */
  failed: number;
  /** Honest note about how far this phone's Dhaga calendar actually reaches. */
  notice: string | null;
}

/** Terminal state of a run. `denied` carries whether asking again is possible. */
export type CalendarOutcome =
  | { kind: "done"; result: CalendarWriteResult }
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "error"; message: string };
