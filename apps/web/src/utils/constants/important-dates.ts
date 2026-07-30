/** Birthday / anniversary reminder defaults (contacts.important_dates). */

/**
 * How far ahead an important date is surfaced as "upcoming". A week is enough
 * lead time to actually send a card or book something, without turning the bell
 * into a standing list. Tunable per user in settings.
 */
export const IMPORTANT_DATE_LEAD_DAYS_DEFAULT = 7;
/** 0 = day-of only. */
export const IMPORTANT_DATE_LEAD_DAYS_MIN = 0;
/** A quarter ahead; past that the reminder stops being a reminder. */
export const IMPORTANT_DATE_LEAD_DAYS_MAX = 90;

/** Oldest year a living contact's birthday can plausibly fall in. */
export const IMPORTANT_DATE_MIN_YEAR = 1900;
/**
 * How many years past the current one the picker reaches. Room for an
 * anniversary or graduation already on the books, while keeping the year
 * dropdown a finite list — react-day-picker needs both bounds to render one at
 * all, and an absent upper bound silently collapses to end-of-this-year.
 */
export const IMPORTANT_DATE_FUTURE_YEARS = 10;
