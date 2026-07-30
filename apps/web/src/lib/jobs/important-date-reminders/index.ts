import { formatCalendarDate } from "@dhaga/core";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { importantDateReminderHtml } from "@/lib/email/important-date-reminder";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import { listUpcomingImportantDates } from "@/lib/repo/reminders";
import {
  getImportantDateLeadDays,
  getImportantDateRemindersEnabled,
} from "@/lib/repo/suggestion-settings";
import {
  getSentReminderTokens,
  pruneExpiredTokens,
  reminderStage,
  reminderToken,
  saveSentReminderTokens,
} from "./state";
import type { UpcomingImportantDate } from "@/lib/repo/reminders";
import type { ScopedRunner } from "@/lib/hosted/tenants";

/** Subject line for the important-dates reminder (pure — unit-tested). */
export function importantDateReminderSubject(count: number): string {
  return `${count} important date${count === 1 ? "" : "s"} coming up`;
}

/**
 * THE ANTI-SPAM RULE. The cron runs every day, so every item inside the lead
 * window would otherwise be emailed every day until it arrived (a 7-day lead =
 * 8 emails about one birthday). An item is included only if this exact
 * (contact, date, occurrence, stage) send has not gone out yet — giving at most
 * two emails per occurrence: one when it enters the window, one on the day.
 *
 * Keying on the OCCURRENCE rather than on `daysUntil` is what makes the next
 * day's run a no-op (7-days-out and 6-days-out share one "lead" token), and
 * keying on the stage is what still lets the day-of nudge through. Because the
 * check is "not yet sent" rather than "daysUntil === leadDays", a skipped cron
 * run does not lose the reminder — it fires on the next run instead.
 *
 * Returns the tokens to persist alongside the items, so the caller marks exactly
 * what it sent (and nothing if the send fails).
 */
export function pendingImportantDateReminders(
  items: UpcomingImportantDate[],
  sentTokens: string[],
): { items: UpcomingImportantDate[]; tokens: string[] } {
  const seen = new Set(sentTokens);
  const pending: UpcomingImportantDate[] = [];
  const tokens: string[] = [];
  for (const item of items) {
    const token = reminderToken(item, reminderStage(item));
    if (seen.has(token)) continue;
    seen.add(token); // a duplicate entry on one contact must not be listed twice
    pending.push(item);
    tokens.push(token);
  }
  return { items: pending, tokens };
}

export interface ImportantDateReminderSummary {
  sent: number; // emails sent this run
  skipped: "no_email" | "no_owner" | null;
}

/**
 * Daily "birthdays and anniversaries coming up" reminder. Reads the dates
 * derived from contacts.important_dates (listUpcomingImportantDates) and emails
 * a digest of the ones not already announced — template-only (no AI, no metered
 * cost).
 *
 * Opt-in: getImportantDateRemindersEnabled() defaults to FALSE and gates every
 * send. Important dates arrive in bulk from address-book imports the user never
 * reviewed, so emailing them by default would be us deciding to notify someone
 * about data they never asked us to watch (privacy-first).
 *
 * In hosted mode it fans out per tenant inside `withUserDb` so every read is
 * RLS-scoped (mirroring follow-up-reminders / linkedin-export-reminders);
 * self-host runs once for the configured owner. Degrades to a clean no-op
 * without Resend.
 */
export async function runImportantDateReminders(
  now: Date = new Date(),
): Promise<ImportantDateReminderSummary> {
  if (!emailEnabled()) return { sent: 0, skipped: "no_email" };

  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app/calendar`;
  const tenants = await hostedTenants();

  // Self-host / core-only: one sweep for the configured owner.
  if (tenants === null) {
    const recipient = ownerEmail();
    if (!recipient) return { sent: 0, skipped: "no_owner" };
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ email: recipient })) return { sent: 0, skipped: null };
    const sent = await sweepUser(runOnGlobal, recipient, appUrl, now);
    return { sent: sent ? 1 : 0, skipped: null };
  }

  // Hosted (RLS on): sweep each tenant inside its own scope. One tenant failing
  // must never abort the rest (best-effort, mirroring follow-up-reminders).
  let sent = 0;
  for (const t of tenants) {
    if (isDummyAccount({ email: t.email, id: t.id })) continue;
    try {
      if (await sweepUser((work) => withUserDb(t.id, work), t.email, appUrl, now)) sent++;
    } catch (error) {
      // Isolate the tenant: logActionError records only { code, name, transient },
      // never the error body (which could echo contact-derived text — privacy rule).
      logActionError("important-date-reminders", error);
    }
  }
  return { sent, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads/writes land (global
 * in self-host, one RLS transaction per unit in hosted); the single sendEmail
 * call runs between those units, never inside one, so no connection is held
 * across the network (connection hygiene, mirroring follow-up-reminders).
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  appUrl: string,
  now: Date,
): Promise<boolean> {
  if (!(await runScoped(() => getImportantDateRemindersEnabled()))) return false;

  const leadDays = await runScoped(() => getImportantDateLeadDays());
  const items = await runScoped(() => listUpcomingImportantDates(leadDays, now));
  if (items.length === 0) return false;

  const alreadySent = await runScoped(() => getSentReminderTokens());
  const pending = pendingImportantDateReminders(items, alreadySent);
  if (pending.items.length === 0) return false; // every date already announced

  const subject = importantDateReminderSubject(pending.items.length);
  const html = emailShell(subject, importantDateReminderHtml(pending.items, { appUrl }));
  const result = await sendEmail({ to: recipient, subject, html });
  if (!result.ok) return false; // mark nothing — the next run retries

  const keep = pruneExpiredTokens(
    [...alreadySent, ...pending.tokens],
    formatCalendarDate(now),
  );
  await runScoped(() => saveSentReminderTokens(keep));
  return true;
}
