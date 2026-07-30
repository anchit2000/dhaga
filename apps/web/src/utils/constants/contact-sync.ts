/** Shared constants for server-side contact sync (Google People, Outlook). */

/**
 * Namespace for the OAuth `state` provider string. The contacts and calendar
 * flows share one state signer (lib/calendar/oauth), so without a prefix a
 * state signed for `google` calendar consent would verify on the `google`
 * contacts callback — letting a calendar grant be stored as a contacts
 * connection. The prefix makes the two mutually unusable.
 */
export const CONTACT_SYNC_STATE_PREFIX = "contacts:";

/** Settings-page query flags the OAuth routes redirect back with. */
export const CONTACT_SYNC_STATUS_PARAM = "contacts";
