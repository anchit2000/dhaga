import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { followUpReminderHtml } from "@/lib/email/follow-up-reminder";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import { getDueFollowUpRemindersForUser } from "@/lib/repo/reminders";
import { isMorningReminderEnabled } from "@/lib/repo/suggestion-settings";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { ScopedRunner } from "@/lib/hosted/tenants";

/** Subject line for the due-follow-ups reminder (pure — unit-tested). */
export function followUpReminderSubject(count: number): string {
  return `${count} follow-up${count === 1 ? "" : "s"} due`;
}

/** The job's send-guard: never email a tenant with nothing due (pure — unit-tested). */
export function hasDueFollowUps(items: CalendarFollowUp[]): boolean {
  return items.length > 0;
}

export interface FollowUpReminderSummary {
  sent: number; // emails sent this run
  skipped: "no_email" | "no_owner" | null;
}

/**
 * Daily "you have follow-ups due today or overdue" reminder. Lists the actual due
 * items (from getDueFollowUpRemindersForUser — the same overdue + due-today set the
 * calendar's notification bell shows), template-only (no AI, no metered cost).
 * Opt-in: reuses the existing morning-reminder toggle (morning_reminder_enabled) —
 * we never email a user who hasn't asked to be emailed (privacy-first), and adding a
 * separate toggle would need a Settings UI change out of this job's scope.
 *
 * In hosted mode it fans out per tenant inside `withUserDb` so every read is
 * RLS-scoped (mirroring linkedin-export-reminders — unlike runMorningReminder /
 * runDailyDigest, which are still single-owner, see docs/FOLLOW_UPS.md). Self-host
 * runs once for the configured owner. Degrades to a clean no-op without Resend.
 */
export async function runFollowUpReminders(): Promise<FollowUpReminderSummary> {
  if (!emailEnabled()) return { sent: 0, skipped: "no_email" };

  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app/calendar`;
  const tenants = await hostedTenants();

  // Self-host / core-only: one sweep for the configured owner.
  if (tenants === null) {
    const recipient = ownerEmail();
    if (!recipient) return { sent: 0, skipped: "no_owner" };
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ email: recipient })) return { sent: 0, skipped: null };
    const sent = await sweepUser(runOnGlobal, recipient, appUrl);
    return { sent: sent ? 1 : 0, skipped: null };
  }

  // Hosted (RLS on): sweep each tenant inside its own scope. One tenant failing
  // must never abort the rest (best-effort, mirroring linkedin-export-reminders).
  let sent = 0;
  for (const t of tenants) {
    if (isDummyAccount({ email: t.email, id: t.id })) continue;
    try {
      if (await sweepUser((work) => withUserDb(t.id, work), t.email, appUrl)) sent++;
    } catch (error) {
      // Isolate the tenant: logActionError records only { code, name, transient },
      // never the error body (which could echo contact-derived text — privacy rule).
      logActionError("follow-up-reminders", error);
    }
  }
  return { sent, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads land (global in
 * self-host, one RLS transaction per unit in hosted); the single sendEmail call
 * runs between those units, never inside one, so no connection is held across the
 * network (connection hygiene, mirroring linkedin-export-reminders).
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  appUrl: string,
): Promise<boolean> {
  if (!(await runScoped(() => isMorningReminderEnabled()))) return false;

  const items = await runScoped(() => getDueFollowUpRemindersForUser());
  if (!hasDueFollowUps(items)) return false;

  const subject = followUpReminderSubject(items.length);
  const html = emailShell(subject, followUpReminderHtml(items, { appUrl }));
  const result = await sendEmail({ to: recipient, subject, html });
  return result.ok;
}
