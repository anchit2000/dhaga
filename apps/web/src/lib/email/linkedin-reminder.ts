/**
 * LinkedIn export reminder body — pure template, zero AI cost. Nudges the user
 * to upload their LinkedIn Connections.csv after they asked LinkedIn for a copy
 * of their connections. Interpolates only a trusted env-derived URL, so no HTML
 * escaping is needed (unlike the contact-name digests).
 */
export function linkedinReminderHtml(input: { appUrl: string }): string {
  // input.appUrl is env-derived (BETTER_AUTH_URL), never user-supplied, so it is
  // trusted and needs no HTML escaping — it is the only value interpolated here.
  return `<p>You asked LinkedIn for a copy of your connections — it usually arrives by email within a day.</p>
    <p style="margin:8px 0 0;color:#f3ede2;">When it lands, upload the Connections.csv and we'll thread everyone into your graph. People already in your graph are skipped safely.</p>
    <p style="margin:24px 0;"><a href="${input.appUrl}" style="background:#e2a44c;color:#0d0b09;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Upload my LinkedIn export</a></p>
    <p style="font-size:13px;color:#a49a8a;margin-top:8px;">Already imported them, or changed your mind? You can ignore this — we'll stop after a week.</p>`;
}
