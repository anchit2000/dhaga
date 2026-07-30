// Split per the 150-line rule; import paths unchanged (./event-map).
export {
  importantDateNote,
  isExternalEventProps,
  isFollowUpEventProps,
  isImportantDateEventProps,
  type CalendarEventProps,
  type ExternalEventProps,
  type FollowUpEventProps,
  type ImportantDateEventProps,
} from "./props";
export {
  toCalendarEvents,
  toExternalCalendarEvents,
  toImportantDateEvents,
  unscheduledFollowUps,
} from "./to-events";
