/**
 * Outbound webhooks (v1.4 ecosystem — the Zapier hook). One env-configured
 * URL receives every event; payloads stay minimal (ids + names, no notes or
 * facts — the receiver can call the export API if it needs more).
 * Fire-and-tolerate: a dead receiver must never break a capture.
 */

export type WebhookEvent = "contact.created" | "followup.created";

export async function emitWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const url = process.env.DHAGA_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, at: new Date().toISOString(), data }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Intentionally swallowed — webhooks are best-effort by contract.
  }
}
