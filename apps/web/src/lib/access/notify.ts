import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

/**
 * "Request received" confirmation + owner notification for a new access
 * request. Shared by the public intake route (api/access-requests) and the
 * signup hook (an unapproved sign-up attempt doubles as a request). No-op
 * when email isn't configured — the request row still exists either way.
 */
export async function notifyAccessApproved(email: string): Promise<void> {
  if (!emailEnabled()) return;
  // Signup is open, so by far the likeliest reader already has an account and
  // has been sitting on /pending — send them to the app, and mention signup
  // only as the fallback for the rarer case (approved off the intake form
  // before they ever created one).
  const base = process.env.BETTER_AUTH_URL ?? "";
  const signupUrl = `${base}/signup?email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "You're in — your Dhaga account is approved",
    html: emailShell(
      "You're approved",
      `<p>Your Dhaga account is approved — you can go straight in:</p>
       <p><a href="${base}/app" style="color:#e2a44c;">Open Dhaga</a></p>
       <p>Haven't created an account yet?
       <a href="${signupUrl}" style="color:#e2a44c;">Sign up here</a>.</p>`,
    ),
  });
}

export async function notifyAccessRejected(email: string): Promise<void> {
  if (!emailEnabled()) return;
  await sendEmail({
    to: email,
    subject: "An update on your Dhaga access request",
    html: emailShell(
      "Access request update",
      `<p>We can't offer access right now. You can submit a new request after 30 days.</p>
       <p>Dhaga remains open source at
       <a href="https://github.com/anchit2000/dhaga" style="color:#e2a44c;">github.com/anchit2000/dhaga</a>.</p>`,
    ),
  });
}

export async function notifyAccessRequested(email: string): Promise<void> {
  if (!emailEnabled()) return;
  await sendEmail({
    to: email,
    subject: "Your Dhaga access request",
    html: emailShell(
      "Request received",
      `<p>We'll email you as soon as you're approved. Founding-price seats
       are assigned in request order.</p>
       <p>Until then: Dhaga is open source. Watch the build at
       <a href="https://github.com/anchit2000/dhaga" style="color:#e2a44c;">github.com/anchit2000/dhaga</a>.</p>`,
    ),
  });
  const owner = ownerEmail();
  if (owner) {
    await sendEmail({
      to: owner,
      subject: "New Dhaga access request",
      html: emailShell(
        "New access request",
        `<p><strong style="color:#f3ede2;">${email}</strong> requested access.</p>`,
      ),
    });
  }
}
