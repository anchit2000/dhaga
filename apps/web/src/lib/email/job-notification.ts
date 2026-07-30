import { emailShell } from "@/lib/email/send";
import type { JobNotificationCopy } from "@/lib/repo/notifications/job-copy";

/** Local to this template, mirroring important-date-reminder.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * The "your background job finished" email — PURE (no DB, no env, no send), so
 * the wording and the escaping are unit-testable.
 *
 * It renders the SAME `JobNotificationCopy` the in-app notification row was
 * built from (repo/notifications/job-copy), never its own phrasing: the bell and
 * the inbox describing one event two different ways is the drift this avoids.
 *
 * Everything copy-derived is escaped before it reaches the markup — the title
 * and body embed a contact name that came from a card scan or an address-book
 * import (`Marks & Spencer`, a name with a stray `<`), and `emailShell`
 * interpolates its title argument raw.
 */
export function jobNotificationHtml(
  copy: JobNotificationCopy,
  opts: { contactUrl: string },
): string {
  const body = copy.body
    ? `<p style="margin:0 0 16px;">${escapeHtml(copy.body)}</p>`
    : "";
  return emailShell(
    escapeHtml(copy.title),
    `${body}
    <p style="margin:0 0 16px;"><a href="${opts.contactUrl}" style="color:#e2a44c;">Open this person in Dhaga →</a></p>
    <p style="margin:0;font-size:13px;">You're getting this because job alerts are on in Settings. Every job is also recorded in your notifications, whether or not it's emailed.</p>`,
  );
}
