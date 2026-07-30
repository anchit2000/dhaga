import type { GooglePersonDate } from "./api-types";

/**
 * ImportantDate.value is "ISO or verbatim" by contract — imports and note
 * extraction both produce fuzzy dates ("June 1990", "next spring"). People's
 * `date` field is structured {year?, month?, day?}, so the two do not map
 * cleanly in either direction.
 *
 * The rule here: structure it only when it is unambiguously structured, and
 * otherwise use Google's own `text` escape hatch. Guessing a day number out of
 * prose would silently invent a birthday, and a wrong birthday is worse than a
 * verbatim one — it fires a reminder on the wrong day every year.
 *
 * `year` is genuinely optional on both sides: a birthday with no year is the
 * normal case in an address book, and People models it as month+day only.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH_DAY = /^--?(\d{2})-(\d{2})$/; // vCard-style "--06-01" (no year)

export function parseImportantDate(value: string): GooglePersonDate | null {
  const trimmed = value.trim();

  const full = ISO_DATE.exec(trimmed);
  if (full) {
    const [, year, month, day] = full;
    return { year: Number(year), month: Number(month), day: Number(day) };
  }

  const monthDay = ISO_MONTH_DAY.exec(trimmed);
  if (monthDay) {
    const [, month, day] = monthDay;
    return { month: Number(month), day: Number(day) };
  }

  return null;
}

/**
 * Render a People date back to the string Dhaga stores. A year-less date comes
 * back as "--MM-DD" rather than inventing the current year, so a round trip
 * cannot turn "birthday, year unknown" into a specific age.
 */
export function formatImportantDate(date: GooglePersonDate | undefined): string | null {
  if (!date?.month || !date.day) return null;
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return date.year ? `${date.year}-${month}-${day}` : `--${month}-${day}`;
}
