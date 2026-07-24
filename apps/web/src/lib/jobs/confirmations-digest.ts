import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { confirmationsDigestHtml } from "@/lib/email/confirmations-digest";
import { listPendingConfirmations } from "@/lib/repo/confirmations";
import { isConfirmationsDigestEnabled } from "@/lib/repo/suggestion-settings";

export interface ConfirmationsDigestSummary {
  sent: boolean;
  pending: number;
  skipped?: "not_enabled" | "no_email" | "no_owner" | "empty" | "send_failed";
}

/**
 * "Confirmations waiting for review" email. Opt-in (isConfirmationsDigestEnabled,
 * default off — privacy-first), template-only (no AI, no metered cost). Like
 * runDailyDigest it runs on the default connection and emails the single owner;
 * full per-tenant fan-out for Dhaga Cloud is the same deferred follow-up that
 * job documents. Skips silently when the inbox is empty.
 */
export async function runConfirmationsDigest(): Promise<ConfirmationsDigestSummary> {
  if (!(await isConfirmationsDigestEnabled())) return { sent: false, pending: 0, skipped: "not_enabled" };
  if (!emailEnabled()) return { sent: false, pending: 0, skipped: "no_email" };
  const recipient = ownerEmail();
  if (!recipient) return { sent: false, pending: 0, skipped: "no_owner" };

  const items = await listPendingConfirmations();
  if (items.length === 0) return { sent: false, pending: 0, skipped: "empty" };

  const html = emailShell("Confirmations waiting for review", confirmationsDigestHtml(items));
  const subject = `${items.length} ${items.length === 1 ? "confirmation" : "confirmations"} to review`;
  const result = await sendEmail({ to: recipient, subject, html });
  return result.ok
    ? { sent: true, pending: items.length }
    : { sent: false, pending: items.length, skipped: "send_failed" };
}
