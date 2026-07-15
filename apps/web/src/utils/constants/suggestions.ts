/** Daily "reach out to these people" suggestion + scheduling defaults. */

/** How many people we suggest per day by default (tunable per user in settings). */
export const DEFAULT_DAILY_SUGGESTION_COUNT = 5;
export const MIN_DAILY_SUGGESTION_COUNT = 1;
export const MAX_DAILY_SUGGESTION_COUNT = 20;

/** Working-hours window meeting slots are proposed within (local to the user). */
export const DEFAULT_WORKING_START_HOUR = 9;
export const DEFAULT_WORKING_END_HOUR = 17;

/** At/above this many meetings on a day, we call it overloaded ("too many meetings"). */
export const DEFAULT_MEETING_OVERLOAD_THRESHOLD = 5;

/** Default proposed meeting length when finding an open slot. */
export const DEFAULT_MEETING_DURATION_MINUTES = 30;
