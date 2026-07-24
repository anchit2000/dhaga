/**
 * Morning follow-up reminder body — pure template, zero AI cost. Nudges the
 * user to open Dhaga when open follow-ups or overdue check-ins are waiting.
 * Interpolates only integers and a trusted env-derived URL, so no HTML
 * escaping is needed (unlike the contact-name digests).
 */
export function morningReminderHtml(input: {
  openFollowUps: number;
  dueReachOuts: number;
  appUrl: string;
}): string {
  const items: string[] = [];
  if (input.openFollowUps > 0) {
    items.push(
      `<li>${input.openFollowUps} open follow-up${input.openFollowUps === 1 ? "" : "s"}</li>`,
    );
  }
  if (input.dueReachOuts > 0) {
    items.push(
      `<li>${input.dueReachOuts} ${input.dueReachOuts === 1 ? "person" : "people"} due for a check-in</li>`,
    );
  }
  return `<p>A quick nudge — you have things waiting in Dhaga:</p>
    <ul style="margin:8px 0 0;padding-left:18px;color:#f3ede2;">${items.join("")}</ul>
    <p style="margin:24px 0;"><a href="${input.appUrl}" style="background:#e2a44c;color:#0d0b09;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open Dhaga</a></p>
    <p style="font-size:13px;color:#a49a8a;margin-top:8px;">Don't want these? Turn off morning reminders in
      <a href="${input.appUrl}/settings" style="color:#e2a44c;">Settings</a>.</p>`;
}
