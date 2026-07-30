import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { confirmationsDigestHtml } from "@/lib/email/confirmations-digest";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import { hasRunForLocalDay, isHourGateEnabled, markRanForLocalDay } from "@/lib/jobs/last-run";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { getSchedulePrefs, isConfirmationsDigestEnabled } from "@/lib/repo/suggestion-settings";
import { isLocalHour, localDayKey } from "@/lib/time/zone";
import { DAILY_EMAIL_JOB_KEYS, MORNING_REMINDER_LOCAL_HOUR } from "@/utils/constants/reminders";
import type { ScopedRunner } from "@/lib/hosted/tenants";

/** Subject line for the confirmations digest (pure — unit-tested). */
export function confirmationsDigestSubject(count: number): string {
  return `${count} ${count === 1 ? "confirmation" : "confirmations"} to review`;
}

export interface ConfirmationsDigestSummary {
  sent: number; // emails sent this run
  skipped: "no_email" | "no_owner" | null;
}

/**
 * "Confirmations waiting for review" email. Opt-in
 * (`confirmations_digest_enabled`, default OFF — privacy-first), template-only
 * (no AI, no metered cost). Skips silently when the inbox is empty.
 *
 * In hosted mode it fans out per tenant inside `withUserDb` so every read is
 * RLS-scoped, mirroring follow-up-reminders / linkedin-export-reminders. That
 * fan-out IS the fix, not a refactor: on the old unscoped connection the settings
 * read returned zero rows under RLS, so `isConfirmationsDigestEnabled()` answered
 * `false` for every hosted tenant and this digest could never send for a paying
 * user. Self-host runs once for the configured owner, unchanged.
 *
 * TIMEZONE / DUPLICATES: see lib/jobs/last-run.ts — opt-in local-hour gate,
 * unconditional one-send-per-tenant-per-local-day record.
 */
export async function runConfirmationsDigest(
  now: Date = new Date(),
): Promise<ConfirmationsDigestSummary> {
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
      logActionError("confirmations-digest", error);
    }
  }
  return { sent, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads/writes land (global
 * in self-host, one RLS transaction per unit in hosted); the single sendEmail call
 * runs between those units, never inside one, so no connection is held across the
 * network (connection hygiene, mirroring follow-up-reminders).
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  now: Date,
): Promise<boolean> {
  if (!(await runScoped(() => isConfirmationsDigestEnabled()))) return false;

  // The tenant's OWN timezone drives both gates (IANA, so DST-correct).
  const prefs = await runScoped(() => getSchedulePrefs());
  if (isHourGateEnabled() && !isLocalHour(now, prefs.timezone, MORNING_REMINDER_LOCAL_HOUR)) {
    return false;
  }
  const dayKey = localDayKey(now, prefs.timezone);
  if (await runScoped(() => hasRunForLocalDay(DAILY_EMAIL_JOB_KEYS.confirmationsDigest, dayKey))) {
    return false;
  }

  const items = await runScoped(() => listPendingConfirmations());
  if (items.length === 0) return false; // empty inbox — send nothing

  const subject = confirmationsDigestSubject(items.length);
  const html = emailShell("Confirmations waiting for review", confirmationsDigestHtml(items));
  const result = await sendEmail({ to: recipient, subject, html });
  if (!result.ok) return false; // mark nothing — the next run retries

  await runScoped(() => markRanForLocalDay(DAILY_EMAIL_JOB_KEYS.confirmationsDigest, dayKey));
  return true;
}
