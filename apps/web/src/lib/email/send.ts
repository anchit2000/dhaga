import { Resend } from "resend";

/**
 * Server-only email via Resend. Optional feature: everything degrades to a
 * clear "not configured" state without the env vars. Never log recipient
 * addresses or email bodies (PII).
 */

const store = globalThis as unknown as { __dhagaResend?: Resend };

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export function ownerEmail(): string | null {
  return process.env.DHAGA_OWNER_EMAIL ?? null;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!emailEnabled()) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY)." };
  }
  store.__dhagaResend ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await store.__dhagaResend.emails.send({
    from: process.env.RESEND_FROM_EMAIL as string,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Shared warm-dark shell so every Dhaga email looks like the product. */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
</head>
<body style="margin:0;padding:0;background:#0d0b09;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="color:#e2a44c;font-size:22px;margin:0 0 4px;">dhaga</p>
    <h1 style="color:#f3ede2;font-size:20px;font-weight:500;margin:0 0 16px;">${title}</h1>
    <div style="color:#a49a8a;font-size:15px;line-height:1.6;">${bodyHtml}</div>
    <p style="color:#5c5347;font-size:12px;margin-top:32px;border-top:1px solid #2b241b;padding-top:12px;">
      Dhaga — every thread, remembered. Open source, private by design.
    </p>
  </div>
</body></html>`;
}
