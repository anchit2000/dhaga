import type { BusyInterval } from "@dhaga/core";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { dailyDigestHtml } from "@/lib/email/daily-digest";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import { hasRunForLocalDay, isHourGateEnabled, markRanForLocalDay } from "@/lib/jobs/last-run";
import { getFreeBusy, hasCalendarConnection } from "@/lib/repo/calendar";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { getSchedulePrefs, isDailyDigestEnabled } from "@/lib/repo/suggestion-settings";
import { isLocalHour, localDayKey } from "@/lib/time/zone";
import { DAILY_EMAIL_JOB_KEYS, MORNING_REMINDER_LOCAL_HOUR } from "@/utils/constants/reminders";
import type { ScopedRunner } from "@/lib/hosted/tenants";

const WEEK_MS = 7 * 86_400_000;

/** Subject line for the reach-out digest (pure — unit-tested). */
export function dailyDigestSubject(count: number): string {
  return `${count} ${count === 1 ? "person" : "people"} to reach out to today`;
}

export interface DailyDigestSummary {
  sent: number; // emails sent this run
  skipped: "no_email" | "no_owner" | null;
}

/**
 * Morning "reach out to these people today" email. Opt-in (`daily_digest_enabled`,
 * default OFF), template-only (no AI, no metered cost). Reads the week's free/busy
 * (if a calendar is connected) so the spread avoids already-busy days.
 *
 * In hosted mode it fans out per tenant inside `withUserDb` so every read is
 * RLS-scoped, mirroring follow-up-reminders / linkedin-export-reminders. That
 * fan-out IS the fix, not a refactor: on the old unscoped connection the settings
 * read returned zero rows under RLS, so `isDailyDigestEnabled()` answered `false`
 * for every hosted tenant and this digest could never send for a paying user.
 * Self-host runs once for the configured owner, unchanged.
 *
 * TIMEZONE / DUPLICATES: see lib/jobs/last-run.ts — opt-in local-hour gate,
 * unconditional one-send-per-tenant-per-local-day record.
 */
export async function runDailyDigest(now: Date = new Date()): Promise<DailyDigestSummary> {
  if (!emailEnabled()) return { sent: 0, skipped: "no_email" };

  const tenants = await hostedTenants();

  // Self-host / core-only: one sweep for the configured owner.
  if (tenants === null) {
    const recipient = ownerEmail();
    if (!recipient) return { sent: 0, skipped: "no_owner" };
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ email: recipient })) return { sent: 0, skipped: null };
    const sent = await sweepUser(runOnGlobal, recipient, now);
    return { sent: sent ? 1 : 0, skipped: null };
  }

  // Hosted (RLS on): sweep each tenant inside its own scope. One tenant failing
  // must never abort the rest (best-effort, mirroring follow-up-reminders).
  let sent = 0;
  for (const t of tenants) {
    if (isDummyAccount({ email: t.email, id: t.id })) continue;
    try {
      if (await sweepUser((work) => withUserDb(t.id, work), t.email, now)) sent++;
    } catch (error) {
      // Isolate the tenant: logActionError records only { code, name, transient },
      // never the error body (which could echo contact-derived text — privacy rule).
      logActionError("daily-digest", error);
    }
  }
  return { sent, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads/writes land (global
 * in self-host, one RLS transaction per unit in hosted); the single sendEmail call
 * runs between those units, never inside one, so no connection is held across the
 * network (connection hygiene, mirroring follow-up-reminders).
 *
 * `getFreeBusy` is handed that same `runScoped` rather than being wrapped in it,
 * so its three phases (read the connection rows → call the providers → flush the
 * token-refresh / needs-reconnect writes) each take their own short scope and the
 * outbound Google/Microsoft call is made holding nothing. Wrapping it — as this
 * did — put one of the three tenant-pool connections behind a third party's
 * latency for its full duration; see docs/FOLLOW_UPS.md and the spec in
 * lib/__tests__/calendar-free-busy-scope/.
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  now: Date,
): Promise<boolean> {
  if (!(await runScoped(() => isDailyDigestEnabled()))) return false;

  // The tenant's OWN timezone drives both gates (IANA, so DST-correct).
  const prefs = await runScoped(() => getSchedulePrefs());
  if (isHourGateEnabled() && !isLocalHour(now, prefs.timezone, MORNING_REMINDER_LOCAL_HOUR)) {
    return false;
  }
  const dayKey = localDayKey(now, prefs.timezone);
  if (await runScoped(() => hasRunForLocalDay(DAILY_EMAIL_JOB_KEYS.dailyDigest, dayKey))) {
    return false;
  }

  let busy: BusyInterval[] = [];
  if (await runScoped(() => hasCalendarConnection())) {
    // `runScoped` is PASSED IN, never wrapped around this call: getFreeBusy scopes
    // each of its DB phases itself and holds none across the provider round-trip.
    // In self-host `runScoped` is `runOnGlobal` (a plain passthrough), so there it
    // stays exactly what it was — no pool, nothing to hold.
    busy = await getFreeBusy({ from: now, to: new Date(now.getTime() + WEEK_MS) }, runScoped);
  }
  const { suggestions } = await runScoped(() => buildDailySuggestions({ date: now, prefs, busy }));
  if (suggestions.length === 0) return false; // nobody to suggest — send nothing

  const subject = dailyDigestSubject(suggestions.length);
  const html = emailShell("People to reach out to today", dailyDigestHtml(suggestions));
  const result = await sendEmail({ to: recipient, subject, html });
  if (!result.ok) return false; // mark nothing — the next run retries

  await runScoped(() => markRanForLocalDay(DAILY_EMAIL_JOB_KEYS.dailyDigest, dayKey));
  return true;
}
