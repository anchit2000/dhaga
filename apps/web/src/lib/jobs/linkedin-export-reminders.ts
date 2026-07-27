import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { linkedinReminderHtml } from "@/lib/email/linkedin-reminder";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import {
  clearLinkedinExportReminder,
  getLinkedinExportRequestedAt,
  getLinkedinRemindersSent,
  hasLinkedinImportSince,
  markLinkedinReminderSent,
} from "@/lib/repo/linkedin-reminders";
import {
  LINKEDIN_REMINDER_OFFSET_DAYS,
  LINKEDIN_REMINDER_WINDOW_DAYS,
} from "@/utils/constants/linkedin";
import type { ScopedRunner } from "@/lib/hosted/tenants";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_OFFSET = LINKEDIN_REMINDER_OFFSET_DAYS[LINKEDIN_REMINDER_OFFSET_DAYS.length - 1];

/** Reminder offset-days that are due now and not yet sent (pure — unit-tested). */
export function dueReminderOffsets(daysSince: number, sent: number[]): number[] {
  return LINKEDIN_REMINDER_OFFSET_DAYS.filter((o) => o <= daysSince && !sent.includes(o));
}

export interface LinkedinExportReminderSummary {
  sent: number; // emails sent this run
  cleared: number; // sequences ended this run (uploaded / window elapsed / cadence complete)
  skipped: "no_email" | "no_owner" | null;
}

/**
 * "Did your LinkedIn export arrive?" reminder sequence. Opt-in: only runs for a
 * user who clicked "Get contacts from LinkedIn" (which records the T0 this job
 * reads), and stops the instant they upload their Connections.csv. Template-only
 * (no AI, no metered cost) — the copy is identical regardless of which offset
 * fires. In hosted mode it fans out per tenant inside `withUserDb` so every read
 * is RLS-scoped; in self-host it runs once for the owner. Degrades to a clean
 * no-op when email isn't configured (no RESEND_* env).
 */
export async function runLinkedinExportReminders(
  now: Date = new Date(),
): Promise<LinkedinExportReminderSummary> {
  if (!emailEnabled()) return { sent: 0, cleared: 0, skipped: "no_email" };

  const tenants = await hostedTenants();

  // Self-host / core-only: one sequence for the configured owner.
  if (tenants === null) {
    const recipient = ownerEmail();
    if (!recipient) return { sent: 0, cleared: 0, skipped: "no_owner" };
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ email: recipient })) return { sent: 0, cleared: 0, skipped: null };
    const r = await sweepUser(runOnGlobal, recipient, now);
    return { sent: r.sent ? 1 : 0, cleared: r.cleared ? 1 : 0, skipped: null };
  }

  // Hosted (RLS on): sweep each tenant inside its own scope. One tenant failing
  // must never abort the rest (best-effort, mirroring detect-signals).
  let sent = 0;
  let cleared = 0;
  for (const t of tenants) {
    if (isDummyAccount({ email: t.email, id: t.id })) continue;
    try {
      const r = await sweepUser((work) => withUserDb(t.id, work), t.email, now);
      if (r.sent) sent++;
      if (r.cleared) cleared++;
    } catch (error) {
      // Isolate the tenant: logActionError records only { code, name, transient },
      // never the error body (which could echo contact-derived text — privacy rule).
      logActionError("linkedin-export-reminders", error);
    }
  }
  return { sent, cleared, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads/writes land (global
 * in self-host, one RLS transaction per unit in hosted); the single sendEmail
 * call runs between those units, never inside one, so no connection is held
 * across the network (connection hygiene, mirroring the detect-signals sweep).
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  now: Date,
): Promise<{ sent: boolean; cleared: boolean }> {
  const requestedAt = await runScoped(() => getLinkedinExportRequestedAt());
  if (!requestedAt) return { sent: false, cleared: false };

  // They uploaded — end the sequence immediately, send nothing.
  if (await runScoped(() => hasLinkedinImportSince(requestedAt))) {
    await runScoped(() => clearLinkedinExportReminder());
    return { sent: false, cleared: true };
  }

  const daysSince = Math.floor((now.getTime() - requestedAt.getTime()) / DAY_MS);
  const sent = await runScoped(() => getLinkedinRemindersSent());
  const due = dueReminderOffsets(daysSince, sent);

  if (due.length === 0) {
    // Nothing due: end the sequence once the window has elapsed or the final
    // (day-7) nudge already went out; otherwise wait for the next offset.
    if (daysSince >= LINKEDIN_REMINDER_WINDOW_DAYS || sent.includes(LAST_OFFSET)) {
      await runScoped(() => clearLinkedinExportReminder());
      return { sent: false, cleared: true };
    }
    return { sent: false, cleared: false };
  }

  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app/import`;
  const subject = "Did your LinkedIn export arrive?";
  const html = emailShell(subject, linkedinReminderHtml({ appUrl }));
  const result = await sendEmail({ to: recipient, subject, html });
  if (!result.ok) return { sent: false, cleared: false }; // retry next run

  // Mark EVERY due offset sent so a missed cron run can't later fire a burst.
  for (const o of due) await runScoped(() => markLinkedinReminderSent(o));

  // Sending the day-7 nudge completes the cadence — end the sequence.
  if (due.includes(LAST_OFFSET)) {
    await runScoped(() => clearLinkedinExportReminder());
    return { sent: true, cleared: true };
  }
  return { sent: true, cleared: false };
}
