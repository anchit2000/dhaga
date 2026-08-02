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

/**
 * Scoring weights for the Home "Today" list, in points. Every candidate is
 * scored as the rounded sum of the terms it earns, so one number ranks people
 * that used to be ordered by which bucket produced them. Fully deterministic —
 * no AI (Rule 5), so smarter suggestions cost nothing per user.
 *
 * The spread is the product decision: things the user ASSERTED outrank things
 * we INFER, and an occasion that expires outranks one that merely waits.
 *
 * Two inputs the scorer needs are deliberately NOT redefined here — it imports
 * them from where they already live: `STRENGTH_HALF_LIFE_DAYS`
 * (@/utils/constants/app) for the quiet term's decay, and `FOLLOW_UP_LEAD_DAYS`
 * (@/utils/constants/reminders) for how far ahead a follow-up counts as due.
 */
export const SUGGESTION_WEIGHTS = {
  /** A cadence is a promise the user made to themselves — the strongest signal
   *  we have, and the only one they can be annoyed at us for dropping. */
  cadence: 40,
  /** Also user-entered, but it names one action rather than the relationship,
   *  so it sits below cadence while still beating anything inferred. */
  followUp: 30,
  /** Ties followUp deliberately: a birthday EXPIRES. A cadence that just came
   *  due scores 0.6 × 40 = 24 and loses nothing by slipping a day, so a full
   *  30 here is what puts the occasion above it on the only day it can be met. */
  importantDate: 30,
  /** A real external event (job change, news), but we inferred that it matters. */
  signal: 25,
  /** Absence of contact is the weakest evidence — it is true of a long tail of
   *  people forever, so it fills the list rather than leading it. */
  quiet: 15,
  /** Structure only, no event behind it: the floor that keeps the list full. */
  degree: 10,
  /** Modifier, never a reason: "you starred them" is not a thing to do today.
   *  It breaks ties between candidates that already earned their place. */
  starred: 10,
  /** Modifier, never a reason: a day-keyed nudge so the same well-connected
   *  contact is not shown every morning. Smallest term — it reorders, it must
   *  never promote someone over a real due item. */
  rotation: 5,
} as const;

/**
 * The terms allowed to become a row's displayed reason. Excludes the two
 * modifiers above, which explain ordering but never explain the ask.
 */
export const SUGGESTION_REASON_TERMS = [
  "cadence",
  "followUp",
  "importantDate",
  "signal",
  "quiet",
  "degree",
] as const;

/**
 * Cadence normalisation floor: points = weight × (BASE + (1 − BASE) × min(
 * daysOverdue / everyDays, 1)). Due today already earns most of the weight —
 * being due IS the event — and the remainder ramps with how overdue it is, so
 * a monthly contact three weeks late outranks one that came due this morning.
 */
export const SUGGESTION_CADENCE_BASE = 0.6;

/** Same shape for a follow-up, with a higher floor: a dated task is binary
 *  (due or not) far more than a cadence is, so overdueness matters less. */
export const SUGGESTION_FOLLOW_UP_BASE = 0.7;

/** Days for a signal's points to halve. A week-old job change is still worth
 *  mentioning; a month-old one is stale news, not a reason to reach out. */
export const SUGGESTION_SIGNAL_HALF_LIFE_DAYS = 7;

/** Degree at which the graph term saturates — past ~10 edges, "well connected"
 *  stops being a meaningful difference between two people. */
export const SUGGESTION_DEGREE_SATURATION = 10;

/** Per-source candidate cap = requested count × this. Enough that a strong
 *  candidate from any one source can still win a slot, small enough that the
 *  scorer never sorts the whole graph. */
export const SUGGESTION_SOURCE_LIMIT_FACTOR = 2;

/** Never show an empty list on a calendar-heavy day: busy-day capacity can
 *  drop to zero, but one person is always worth surfacing. */
export const MIN_SUGGESTIONS_ON_BUSY_DAY = 1;

/** Signal headlines are free text from an external source; truncate before
 *  they wrap a suggestion row into three lines. */
export const SUGGESTION_SIGNAL_HEADLINE_MAX = 60;
