/**
 * Connected-calendar repository. Split from a single file when M2 added the
 * opt-in full tier; every previous import path (`@/lib/repo/calendar`) still
 * resolves through this barrel.
 *
 * The tiering rule the whole module obeys: what a connection may do is DERIVED
 * from the scope it was granted (packages/core calendar/capability.ts), so a
 * connection made for free/busy stays free/busy — `listEvents` is never called
 * for it and nothing is ever written to it — until the user opts in and
 * re-consents, which rewrites its stored scope.
 */
export {
  listCalendarConnections,
  hasCalendarConnection,
  saveCalendarConnection,
  deleteCalendarConnection,
  setCalendarWriteEnabled,
  type CalendarConnectionSummary,
} from "./connections";
export { getFreeBusy } from "./free-busy";
export { getExternalCalendarEvents, type ExternalCalendarEvent } from "./events";
export { syncFollowUpToCalendars, syncNoteFollowUpsToCalendars } from "./write-out";
