// Split per the 150-line rule; import paths unchanged (@/lib/repo/events).
export {
  getEvent,
  listContactEvents,
  listEventContacts,
  listEventFilterOptions,
  listEvents,
  listEventsPage,
  type EventListItem,
} from "./queries";
export {
  addContactToEvent,
  createEvent,
  mergeEvents,
  removeContactFromEvent,
  renameEvent,
  updateEventMeta,
} from "./mutations";
