/**
 * Device-calendar constants. Brand colours live in COLORS ("@/utils/constants")
 * and the calendar's NAME/DESCRIPTION live in @dhaga/core — read them there,
 * never redefined here. This file holds only the fixed values the calendar
 * surface adds on top.
 *
 * Nothing here VALUE-imports expo-calendar: the pure modules that read these
 * constants are unit-tested in a plain node environment, and one native import
 * anywhere in that graph would break them. Where expo-calendar wants one of its
 * string enums (entityType, accessLevel) the native adapter supplies it
 * directly — see ../../lib/calendar/device.ts.
 */

/** expo-router segment name + href for the calendar screen. */
export const CALENDAR_SCREEN = "calendar" as const;
export const CALENDAR_HREF = "/calendar" as const;

/**
 * How much of the device calendar the agenda shows. A week back is enough to
 * see what just happened without turning the screen into an archive; six weeks
 * ahead covers the horizon a follow-up is normally set on. Both bound the
 * expo-calendar read, which is a device query — not a server one.
 */
export const AGENDA_DAYS_BACK = 7;
export const AGENDA_DAYS_AHEAD = 42;

/**
 * followUpId → device event id, kept in a document-directory JSON file (same
 * convention as pending-capture.json). This is the mobile equivalent of the
 * web's calendar_event_links table: without it a second run cannot tell an
 * event it already wrote from one it has not, and every run would duplicate
 * every follow-up.
 */
export const CALENDAR_LINKS_FILE = "calendar-links.json";

/**
 * Server endpoint the follow-ups come from.
 *
 * NOTE (blocking, surfaced rather than hidden — CLAUDE.md Rule 12): this route
 * does NOT exist yet. Web renders its calendar from getCalendarFollowUps()
 * server-side, so no api-key-authenticated endpoint publishes follow-ups. The
 * one existing route that carries them, GET /api/export/json, is unusable here:
 * it dumps the whole graph including card_images.data_base64 — every scanned
 * business card — which would be tens of megabytes per refresh. Everything else
 * on this screen (device events, the Dhaga calendar, write-out) works today;
 * follow-ups stay empty behind an honest error until the route ships.
 */
export const FOLLOW_UPS_PATH = "/api/follow-ups";

/** Colour the OS paints the Dhaga calendar's events with (COLORS.amber). */
export const DHAGA_CALENDAR_COLOR = "#e2a44c";

/**
 * expo-calendar Source.type values whose calendars never leave the phone
 * (SourceType.LOCAL). Compared as a plain string because Source.type is typed
 * `string | SourceType` — the enum is not needed to read one.
 */
export const LOCAL_SOURCE_TYPES: readonly string[] = ["local"];

/**
 * Android calendar-creation fields. Android has no "ask the OS for the default
 * account" call, and a calendar inserted under a Google account is NOT picked
 * up by Google's sync adapter — it would look synced and never leave the phone.
 * A local account is the honest option, and ANDROID_CALENDAR_NOTICE says so out
 * loud, exactly as ANDROID_ACCOUNT_NOTICE does for contact sync.
 */
export const ANDROID_LOCAL_SOURCE = {
  isLocalAccount: true,
  name: "Dhaga",
  type: "local",
} as const;
export const ANDROID_OWNER_ACCOUNT = "Dhaga";

/** iOS, but the account holding the Dhaga calendar is device-only. */
export const LOCAL_CALENDAR_NOTICE =
  "The Dhaga calendar lives only on this iPhone, so the follow-ups written to it stay here. Turn on iCloud Calendars in iOS Settings to have them reach your other devices.";

/** Android — see ANDROID_LOCAL_SOURCE above for why this is unavoidable. */
export const ANDROID_CALENDAR_NOTICE =
  "Android doesn't let apps add a calendar to your Google account, so the Dhaga calendar is stored on this phone. Its follow-ups show up in your calendar app here, but won't reach your other devices.";

/** What the calendar screen shows while each step of a run is in flight. */
export const CALENDAR_PHASE_LABELS = {
  permission: "Asking for calendar access…",
  reading: "Reading this phone's calendar…",
  fetching: "Fetching your follow-ups…",
  writing: "Writing follow-ups to the Dhaga calendar…",
} as const;

/** Weekday + date header on each agenda day, in the phone's locale. */
export const AGENDA_DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};

/** Start/end time shown on a timed device event. */
export const AGENDA_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

/** An untitled device event is real (a private block) — label it honestly
 *  rather than rendering an empty row. Mirrors the web board's fallback. */
export const UNTITLED_DEVICE_EVENT = "Busy";
