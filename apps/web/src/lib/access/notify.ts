import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";

/**
 * "Request received" confirmation + owner notification for a new access
 * request. Shared by the public intake route (api/access-requests) and the
 * signup hook (an unapproved sign-up attempt doubles as a request). No-op
 * when email isn't configured — the request row still exists either way.
 */
export async function notifyAccessApproved(email: string): Promise<void> {
  if (!emailEnabled()) return;
  const signupUrl = `${process.env.BETTER_AUTH_URL ?? ""}/signup?email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "You're in — sign up for Dhaga",
    html: emailShell(
      "You're approved",
      `<p>Your access request was approved. Create your account:</p>
       <p><a href="${signupUrl}" style="color:#e2a44c;">Sign up for Dhaga</a></p>`,
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
