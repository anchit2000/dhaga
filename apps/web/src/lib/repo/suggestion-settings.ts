import { getSetting, setSetting } from "./settings";
import {
  DEFAULT_DAILY_SUGGESTION_COUNT,
  DEFAULT_MEETING_OVERLOAD_THRESHOLD,
  DEFAULT_WORKING_END_HOUR,
  DEFAULT_WORKING_START_HOUR,
  MAX_DAILY_SUGGESTION_COUNT,
  MIN_DAILY_SUGGESTION_COUNT,
} from "@/utils/constants/suggestions";

/**
 * Per-user tuning for the daily suggestion + scheduling feature. Reuses the
 * key/value settings table (constraint-name upsert, EE-safe — see settings.ts)
 * rather than new columns: these are a handful of scalars, nothing relational.
 */

const SUGGESTION_COUNT_KEY = "daily_suggestion_count";
const SCHEDULE_PREFS_KEY = "schedule_prefs";
const DAILY_DIGEST_KEY = "daily_digest_enabled";

export interface SchedulePrefs {
  startHour: number;
  endHour: number;
  overloadThreshold: number;
  /** Minutes offset from UTC (IST = 330, PST = -480). Set from the browser. */
  utcOffsetMinutes: number;
}

const DEFAULT_SCHEDULE_PREFS: SchedulePrefs = {
  startHour: DEFAULT_WORKING_START_HOUR,
  endHour: DEFAULT_WORKING_END_HOUR,
  overloadThreshold: DEFAULT_MEETING_OVERLOAD_THRESHOLD,
  utcOffsetMinutes: 0,
};

function clampCount(value: number): number {
  return Math.min(MAX_DAILY_SUGGESTION_COUNT, Math.max(MIN_DAILY_SUGGESTION_COUNT, Math.round(value)));
}

/** How many people to suggest per day (default 5; clamped to a sane range). */
export async function getDailySuggestionCount(): Promise<number> {
  const raw = await getSetting(SUGGESTION_COUNT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? clampCount(parsed) : DEFAULT_DAILY_SUGGESTION_COUNT;
}

export async function setDailySuggestionCount(count: number): Promise<void> {
  await setSetting(SUGGESTION_COUNT_KEY, String(clampCount(count)));
}

export async function getSchedulePrefs(): Promise<SchedulePrefs> {
  const raw = await getSetting(SCHEDULE_PREFS_KEY);
  if (!raw) return DEFAULT_SCHEDULE_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<SchedulePrefs>;
    return {
      startHour: parsed.startHour ?? DEFAULT_SCHEDULE_PREFS.startHour,
      endHour: parsed.endHour ?? DEFAULT_SCHEDULE_PREFS.endHour,
      overloadThreshold: parsed.overloadThreshold ?? DEFAULT_SCHEDULE_PREFS.overloadThreshold,
      utcOffsetMinutes: parsed.utcOffsetMinutes ?? DEFAULT_SCHEDULE_PREFS.utcOffsetMinutes,
    };
  } catch {
    return DEFAULT_SCHEDULE_PREFS;
  }
}

export async function setSchedulePrefs(prefs: SchedulePrefs): Promise<void> {
  await setSetting(SCHEDULE_PREFS_KEY, JSON.stringify(prefs));
}

/** Whether the user opted into the morning email digest (default: off). */
export async function isDailyDigestEnabled(): Promise<boolean> {
  return (await getSetting(DAILY_DIGEST_KEY)) === "on";
}

export async function setDailyDigestEnabled(enabled: boolean): Promise<void> {
  await setSetting(DAILY_DIGEST_KEY, enabled ? "on" : "off");
}
