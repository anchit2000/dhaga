/**
 * Server-only SMS via Twilio's REST API (plain fetch, no SDK dependency).
 * Optional feature mirroring email/send.ts: without the env vars everything
 * degrades to a clear "not configured" error instead of failing silently.
 * Swapping providers = reimplementing sendSms() here; nothing else in the
 * app knows about Twilio. Never log phone numbers or message bodies (PII).
 */

export function smsEnabled(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export interface SendSmsInput {
  to: string;
  body: string;
}

export async function sendSms(input: SendSmsInput): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "SMS is not configured (TWILIO_ACCOUNT_SID)." };
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: input.to, From: from, Body: input.body }).toString(),
    },
  );
  if (!res.ok) return { ok: false, error: `SMS provider responded ${res.status}.` };
  return { ok: true };
}
