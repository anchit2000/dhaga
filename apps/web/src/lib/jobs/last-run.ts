import { getSetting, setSetting } from "@/lib/repo/settings";
import { REMINDER_HOUR_GATE_ENV_VARS } from "@/utils/constants/reminders";

/**
 * The two-part send gate the daily email jobs share, so "may this tenant be
 * emailed on this run?" is answered in one place instead of three:
 *
 * 1. `isHourGateEnabled()` — OPT-IN. Whether to require the run to fall on the
 *    recipient's local reminder hour at all.
 * 2. `hasRunForLocalDay()` / `markRanForLocalDay()` — UNCONDITIONAL. At most one
 *    send per tenant per THEIR local day, however often the cron is triggered.
 *
 * Both halves live here because they are one decision, and because part 2 is the
 * half that must hold no matter how part 1 is configured: with the hour gate off
 * (the Vercel Hobby default) it is the only thing standing between a re-triggered
 * cron and a duplicate email.
 *
 * Every function here does DB work through the request-scoped `getSetting` /
 * `setSetting`, so it must be called INSIDE a tenant scope (`withUserDb`) in
 * hosted mode — that is what makes the record per-user (settings' primary key is
 * `(user_id, key)` under EE RLS; see repo/settings.ts).
 */

/** Settings-key suffix for a job's "last local day I emailed this tenant" record. */
const LAST_LOCAL_DAY_SUFFIX = "_last_local_day";

function lastLocalDayKey(jobKey: string): string {
  return `${jobKey}${LAST_LOCAL_DAY_SUFFIX}`;
}

/**
 * Whether the recipient-local-hour gate is switched on. Reads the env on every
 * call rather than at module load so a test (and a redeploy) sees the current
 * value. Both accepted names are checked — see REMINDER_HOUR_GATE_ENV_VARS for
 * why the original morning-reminder-only name still works.
 */
export function isHourGateEnabled(): boolean {
  return REMINDER_HOUR_GATE_ENV_VARS.some((name) => process.env[name] === "true");
}

/**
 * Whether this job already emailed this tenant during `dayKey` (the recipient's
 * own local calendar day, YYYY-MM-DD). Idempotency, not scheduling: the cron can
 * be re-triggered, retried by the platform, or driven hourly, and the tenant
 * still gets at most one of these emails per local day.
 *
 * An unreadable value counts as "not sent" — a corrupt row must fail towards
 * delivering the email the user opted into, never towards silently suppressing it
 * forever.
 */
export async function hasRunForLocalDay(jobKey: string, dayKey: string): Promise<boolean> {
  const raw = await getSetting(lastLocalDayKey(jobKey));
  if (!raw) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" && parsed === dayKey;
  } catch {
    return false;
  }
}

/**
 * Record that this job emailed this tenant on `dayKey`. Stores ONLY the latest
 * day key (JSON-encoded, ~12 bytes), overwriting the previous one — unlike the
 * important-date / LinkedIn send records this is not a set of outstanding tokens,
 * so there is nothing to accumulate and nothing to prune: the row is bounded by
 * construction and cannot grow with the number of days the job has run.
 *
 * JSON-encoded rather than stored bare for the reason state.ts documents: a
 * delimiter- or format-sensitive encoding is how a stored marker silently starts
 * matching something it isn't. `JSON.parse` + a `typeof` check means any value
 * this function did not write reads as "no record" instead of as a coincidence.
 */
export async function markRanForLocalDay(jobKey: string, dayKey: string): Promise<void> {
  await setSetting(lastLocalDayKey(jobKey), JSON.stringify(dayKey));
}
