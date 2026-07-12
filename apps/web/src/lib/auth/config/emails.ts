import { emailShell, sendEmail } from "@/lib/email/send";

/**
 * better-auth transactional emails (magic link, OTP, verification, password
 * reset), all through the shared Resend sender + warm-dark shell. Every
 * sender throws when email isn't configured or delivery fails — better-auth
 * has already told the user "check your inbox", so a silent failure here
 * would strand them (fail loud).
 */

function cta(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background:#e2a44c;color:#0d0b09;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

async function mustSend(to: string, subject: string, html: string): Promise<void> {
  const { ok, error } = await sendEmail({ to, subject, html });
  if (!ok) throw new Error(error ?? "Email delivery failed.");
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await mustSend(
    email,
    "Your Dhaga sign-in link",
    emailShell(
      "Sign in to Dhaga",
      `<p>Click the button below to sign in. The link expires in a few minutes
       and works once.</p>${cta(url, "Sign in")}
       <p>Didn't request this? You can ignore it.</p>`,
    ),
  );
}

export async function sendOtpEmail(
  email: string,
  otp: string,
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
): Promise<void> {
  const titles = {
    "sign-in": "Your sign-in code",
    "email-verification": "Verify your email",
    "forget-password": "Reset your password",
    "change-email": "Confirm your new email",
  } as const;
  await mustSend(
    email,
    `${titles[type]} — Dhaga`,
    emailShell(
      titles[type],
      `<p>Your one-time code:</p>
       <p style="color:#f3ede2;font-size:28px;letter-spacing:6px;font-family:monospace;">${otp}</p>
       <p>It expires in a few minutes. Didn't request this? You can ignore it.</p>`,
    ),
  );
}

export async function sendVerifyEmail(email: string, url: string): Promise<void> {
  await mustSend(
    email,
    "Verify your email — Dhaga",
    emailShell(
      "Verify your email",
      `<p>Confirm this address to finish setting up your account.</p>
       ${cta(url, "Verify email")}`,
    ),
  );
}

export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  await mustSend(
    email,
    "Reset your password — Dhaga",
    emailShell(
      "Reset your password",
      `<p>Someone (hopefully you) asked to reset your Dhaga password.</p>
       ${cta(url, "Choose a new password")}
       <p>Didn't request this? You can ignore it — your password is unchanged.</p>`,
    ),
  );
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app`;
  await mustSend(
    email,
    "Welcome to Dhaga",
    emailShell(
      "Welcome to Dhaga",
      `<p>Your email is verified and your account is ready.</p>
       ${cta(appUrl, "Open Dhaga")}`,
    ),
  );
}
