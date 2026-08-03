import { getSettings } from "../settings";
import {
  IMPORTANT_DATE_LEAD_DAYS_KEY,
  parseImportantDateLeadDays,
} from "./emails";
import {
  SCHEDULE_PREFS_KEY,
  SUGGESTION_COUNT_KEY,
  parseDailySuggestionCount,
  parseSchedulePrefs,
  type SchedulePrefs,
} from "./schedule";

/**
 * The three scalars Home's dashboard needs, in ONE settings round-trip.
 *
 * Read one at a time they cost three, and Home paid five in total (measured):
 * `getSchedulePrefs` for the working-hours maths, then `getDailySuggestionCount`,
 * `getImportantDateLeadDays` and a *second* `getSchedulePrefs` (for the user's
 * zone) inside the suggestion engine. On an RSC page read every one of those
 * runs on the SAME request-pinned tenant connection (lib/db/request-scope.ts),
 * so they are serial round-trips that each extend how long the request holds one
 * of the three tenant-pool slots. Same collapse the search reads got.
 *
 * Callers pass these down as the engine's existing injection slots (`prefs`,
 * `count`, `leadDays`) — the single-key accessors stay for every caller that
 * genuinely needs one value.
 */
export interface SuggestionSettings {
  prefs: SchedulePrefs;
  count: number;
  leadDays: number;
}

export async function getSuggestionSettings(): Promise<SuggestionSettings> {
  const values = await getSettings([
    SCHEDULE_PREFS_KEY,
    SUGGESTION_COUNT_KEY,
    IMPORTANT_DATE_LEAD_DAYS_KEY,
  ]);
  return {
    prefs: parseSchedulePrefs(values.get(SCHEDULE_PREFS_KEY)),
    count: parseDailySuggestionCount(values.get(SUGGESTION_COUNT_KEY)),
    leadDays: parseImportantDateLeadDays(values.get(IMPORTANT_DATE_LEAD_DAYS_KEY)),
  };
}
