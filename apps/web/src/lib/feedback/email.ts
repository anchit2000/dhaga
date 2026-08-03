import { emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import type { FeedbackSubmission } from "@/lib/feedback/context";

/** Local to this template, mirroring daily-digest.ts — a 5-line helper. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function contextHtml(input: FeedbackSubmission): string {
  const rows = [
    ["Page", input.route],
    ["Screen", input.viewport],
    ["Locale", input.locale],
    ["Timezone", input.timezone],
    ["Build", input.appVersion],
    ["Browser", input.userAgent],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return rows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 4px;font-size:13px;">${label}: <span style="color:#f3ede2;">${escapeHtml(value)}</span></p>`,
    )
    .join("");
}

/**
 * Tell the owner someone wrote in. Carries the report and the same debugging
 * context the user was shown before sending — no more, so the email cannot
 * become a side channel around the table's allow-list. The user id identifies
 * who to reply to; /app/admin/feedback resolves it to a name and address, which
 * keeps a third party's contact details out of a mailbox.
 */
export async function emailOwnerAboutFeedback(
  input: FeedbackSubmission,
  userId: string,
): Promise<void> {
  const to = ownerEmail();
  if (!to) return;
  await sendEmail({
    to,
    subject: "New Dhaga feedback",
    html: emailShell(
      "New feedback",
      `<p style="white-space:pre-wrap;color:#f3ede2;">${escapeHtml(input.message)}</p>
       <div style="margin-top:20px;border-top:1px solid #2b241b;padding-top:12px;color:#5c5347;">
         <p style="margin:0 0 4px;font-size:13px;">From user: <span style="color:#f3ede2;">${escapeHtml(userId)}</span></p>
         ${contextHtml(input)}
       </div>
       <p style="margin-top:20px;"><a href="${process.env.BETTER_AUTH_URL ?? ""}/app/admin/feedback" style="color:#e2a44c;">Open feedback in admin</a></p>`,
    ),
  });
}

/**
 * Fire the owner notification WITHOUT ever failing the caller. The row is
 * already committed by the time this runs, and losing a user's report because
 * Resend was down (or unconfigured, as on every self-host) would be the worse
 * bug — so a throw is swallowed here rather than propagated. `sendEmail` itself
 * returns `{ ok: false }` instead of throwing for the configured/rejected
 * cases; the try/catch covers a network throw from the SDK.
 *
 * Log the failure shape only — never the recipient, the message or the context
 * (lib/email/send.ts: "Never log recipient addresses or email bodies").
 */
export async function notifyOwnerBestEffort(
  input: FeedbackSubmission,
  userId: string,
): Promise<void> {
  try {
    await emailOwnerAboutFeedback(input, userId);
  } catch (error) {
    const name = error instanceof Error ? error.name : typeof error;
    console.error("[feedback] owner email failed", { name });
  }
}
