/**
 * Device-calendar integration for mobile — the phone-side counterpart of the
 * web's OAuth calendar connection.
 *
 * There is no OAuth here, and that is the point. The device address book is
 * already the thing iOS and Android relay to iCloud/Google (see ../sync and
 * docs/guide/syncing-your-phone), and the device CALENDAR relays the same way:
 * writing a follow-up into a calendar the phone owns puts it on the user's
 * laptop and watch with no token, no scope screen and no server round trip.
 *
 * engine.ts drives one run in either direction; device.ts / write.ts are the
 * native I/O; agenda.ts, plan.ts and target.ts hold the pure logic the unit
 * tests exercise. Follow-ups are shaped by @dhaga/core's followUpToCalendarEvent
 * so the phone and the web write-out cannot drift on what an event looks like.
 */
export { loadCalendarView, writeFollowUpsToDevice } from "./engine";
export { buildAgenda, localDayKey, startOfLocalDay, unscheduledFollowUps } from "./agenda";
export { calendarPlatform } from "./device";
export { linksAfterWrites, planCalendarWrites, toDeviceDates } from "./plan";
export { calendarNotice, dhagaCalendarSource, findDhagaCalendar } from "./target";
export type {
  AgendaDay,
  AgendaItem,
  CalendarLoad,
  CalendarOutcome,
  CalendarPhase,
  CalendarPhaseHandler,
  CalendarView,
  CalendarWriteResult,
  FollowUpSummary,
} from "./types";
