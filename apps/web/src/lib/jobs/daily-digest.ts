import type { BusyInterval } from "@dhaga/core";
import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { dailyDigestHtml } from "@/lib/email/daily-digest";
import { getFreeBusy, hasCalendarConnection } from "@/lib/repo/calendar";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { getSchedulePrefs, isDailyDigestEnabled } from "@/lib/repo/suggestion-settings";

const WEEK_MS = 7 * 86_400_000;

export interface DailyDigestSummary {
  sent: boolean;
  suggested: number;
  skipped?: "not_enabled" | "no_email" | "no_owner" | "empty" | "send_failed";
}

/**
 * Morning "reach out to these people today" email. Opt-in (isDailyDigestEnabled),
 * template-only (no AI, no metered cost). Runs on the default connection like
 * the signal-detection job — multi-tenant fan-out is the same deferred follow-up
 * that job documents. Reads the week's free/busy (if a calendar is connected) so
 * the spread avoids already-busy days.
 */
export async function runDailyDigest(now: Date = new Date()): Promise<DailyDigestSummary> {
  if (!(await isDailyDigestEnabled())) return { sent: false, suggested: 0, skipped: "not_enabled" };
  if (!emailEnabled()) return { sent: false, suggested: 0, skipped: "no_email" };
  const recipient = ownerEmail();
  if (!recipient) return { sent: false, suggested: 0, skipped: "no_owner" };

  const prefs = await getSchedulePrefs();
  let busy: BusyInterval[] = [];
  if (await hasCalendarConnection()) {
    busy = await getFreeBusy({ from: now, to: new Date(now.getTime() + WEEK_MS) });
  }
  const { suggestions } = await buildDailySuggestions({ date: now, prefs, busy });
  if (suggestions.length === 0) return { sent: false, suggested: 0, skipped: "empty" };

  const html = emailShell("People to reach out to today", dailyDigestHtml(suggestions));
  const subject = `${suggestions.length} ${suggestions.length === 1 ? "person" : "people"} to reach out to today`;
  const result = await sendEmail({ to: recipient, subject, html });
  return result.ok
    ? { sent: true, suggested: suggestions.length }
    : { sent: false, suggested: suggestions.length, skipped: "send_failed" };
}
