/** LinkedIn contact-import helpers: the export page we deep-link to, the
 *  reminder cadence, and the durable receipt marker shared by the import writer
 *  and the "did they upload yet?" detector so the two can never drift. */

/** LinkedIn's "Get a copy of your data" export page (the Connections archive). */
export const LINKEDIN_EXPORT_URL =
  "https://www.linkedin.com/mypreferences/d/download-my-data";

/**
 * Reminder cadence, in whole days after the user requests their export:
 * +1, then +2 (day 3), +3 (day 6), +1 (day 7) — then the sequence stops.
 * LinkedIn emails the archive ~24h out, so the first nudge lands as it should
 * be arriving. We also stop early the moment they upload LinkedIn contacts.
 */
export const LINKEDIN_REMINDER_OFFSET_DAYS = [1, 3, 6, 7] as const;

/** The sequence is abandoned once this many days pass with no upload. */
export const LINKEDIN_REMINDER_WINDOW_DAYS = 7;

/**
 * Prefix of the receipt note written for every LinkedIn Connections import
 * (apps/web/src/lib/import/linkedin.ts). The reminder job answers "has this
 * user uploaded their LinkedIn contacts since T0?" by matching notes whose
 * body starts with this string — so both sides MUST use this one constant.
 */
export const LINKEDIN_IMPORT_RECEIPT_PREFIX =
  "Imported from LinkedIn Connections export";
