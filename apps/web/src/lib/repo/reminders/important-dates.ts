import { asc, sql } from "drizzle-orm";
import {
  daysUntil,
  formatCalendarDate,
  importantDateOccurrencesInRange,
  nextImportantDateOccurrence,
  parseImportantDate,
  yearsTurning,
  type CalendarDay,
  type ImportantDate,
  type ParsedImportantDate,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { userToday } from "./local-today";

/**
 * Birthday / anniversary reminders, DERIVED from the contacts.important_dates
 * jsonb column — there is no reminders table, the same way reach-outs derive
 * from contacts.reachOutEveryDays (see ./reach-outs.ts).
 *
 * Both reads are ONE query: the annual-recurrence maths needs the whole entry
 * anyway and cannot be expressed usefully in SQL (values are free text, most
 * carry no year), so we select the contacts that have any important date and
 * compute in JS. Never fan getDb() out under Promise.all here — that exhausts
 * the max-3 tenant pool.
 *
 * Both are safe inside `withUserDb` (the email job's scope): getDb() resolves to
 * whichever tenant scope is active, so no *ForUser variant is needed — unlike
 * calendar.ts, where getDueFollowUpRemindersForUser exists to change the FILTER
 * (uncapped, due-soon only), not the connection.
 *
 * "Today" is the USER's day, resolved from their stored zone via ./local-today —
 * a birthday must not read as tomorrow's for someone west of the server.
 */

export interface UpcomingImportantDate {
  contactId: string;
  contactName: string;
  /** What it marks: "Birthday", "Anniversary", … (verbatim from the entry). */
  label: string;
  /** The raw stored value, for display fidelity ("1990-03-14", "03-14"). */
  value: string;
  /** ISO calendar date (YYYY-MM-DD) of the occurrence, local — never UTC-shifted. */
  date: string;
  /** 0 = today; negative for a past occurrence inside a calendar window. */
  daysUntil: number;
  /** Age / anniversary count, or null when the stored value carried no year. */
  turning: number | null;
}

interface ContactDatesRow {
  id: string;
  name: string;
  importantDates: ImportantDate[];
}

/**
 * Contacts carrying at least one important date. `jsonb_typeof` guards the
 * length call: legacy rows could hold a non-array json, and jsonb_array_length
 * errors rather than returning 0 on those.
 */
async function selectContactsWithDates(): Promise<ContactDatesRow[]> {
  const db = await getDb();
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      importantDates: contacts.importantDates,
    })
    .from(contacts)
    .where(
      sql`jsonb_typeof(${contacts.importantDates}) = 'array' and jsonb_array_length(${contacts.importantDates}) > 0`,
    )
    .orderBy(asc(contacts.name));
}

function toItem(
  row: ContactDatesRow,
  entry: ImportantDate,
  parsed: ParsedImportantDate,
  occurrence: Date,
  today: CalendarDay,
): UpcomingImportantDate {
  return {
    contactId: row.id,
    contactName: row.name,
    label: entry.label,
    value: entry.value,
    date: formatCalendarDate(occurrence),
    daysUntil: daysUntil(occurrence, today),
    turning: yearsTurning(parsed, occurrence),
  };
}

/** Ascending calendar date — soonest first, and stable by name within a day. */
function bySoonest(a: UpcomingImportantDate, b: UpcomingImportantDate): number {
  return a.date.localeCompare(b.date) || a.contactName.localeCompare(b.contactName);
}

/**
 * Every important date whose next occurrence falls in [today, today + leadDays].
 * Unparseable values are skipped, not guessed: an imported "spring 2019" told us
 * the day is unknown (see parseImportantDate).
 */
export async function listUpcomingImportantDates(
  leadDays: number,
  now: Date = new Date(),
  timeZone?: string, // the caller's prefs.timezone; see userToday in ./local-today
): Promise<UpcomingImportantDate[]> {
  // Sequential, never Promise.all — see ./local-today on the 3-connection pool.
  const today = await userToday(now, timeZone);
  const rows = await selectContactsWithDates();
  const items: UpcomingImportantDate[] = [];
  for (const row of rows) {
    for (const entry of row.importantDates) {
      const parsed = parseImportantDate(entry.value);
      if (!parsed) continue;
      const occurrence = nextImportantDateOccurrence(parsed, today);
      if (daysUntil(occurrence, today) > leadDays) continue;
      items.push(toItem(row, entry, parsed, occurrence, today));
    }
  }
  return items.sort(bySoonest);
}

/**
 * Every occurrence inside an arbitrary window, for the calendar grid (which
 * spans ~3 months and can straddle a year boundary, so one date can appear
 * twice). `daysUntil` stays relative to today, so a past occurrence still in the
 * window reads negative.
 */
export async function listImportantDateOccurrences(range: {
  from: Date;
  to: Date;
}): Promise<UpcomingImportantDate[]> {
  const today = await userToday();
  const rows = await selectContactsWithDates();
  const items: UpcomingImportantDate[] = [];
  for (const row of rows) {
    for (const entry of row.importantDates) {
      const parsed = parseImportantDate(entry.value);
      if (!parsed) continue;
      for (const occurrence of importantDateOccurrencesInRange(parsed, range.from, range.to)) {
        items.push(toItem(row, entry, parsed, occurrence, today));
      }
    }
  }
  return items.sort(bySoonest);
}
