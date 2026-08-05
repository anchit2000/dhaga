// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole api/razorpay/** folder; nothing else in the app references it.
import { handleRazorpayWebhook, razorpayEnabled } from "@dhaga/ee/billing";

/**
 * Deliberately public — the third auth-exempt route, after access-requests and
 * the Stripe webhook. Razorpay's signature (verified inside
 * handleRazorpayWebhook, against RAZORPAY_WEBHOOK_SECRET) is the auth.
 *
 * This is the authoritative grant path: unlike /api/razorpay/verify it does not
 * depend on the buyer's browser, so it survives a closed tab, and it is what
 * keeps a renewing subscription's status current long after checkout.
 */
export async function POST(request: Request): Promise<Response> {
  // Same belt-and-suspenders as api/stripe — inert unless hosted mode is
  // explicitly on, regardless of whether EE happens to be present.
  if (process.env.DHAGA_HOSTED_MODE !== "true" || !razorpayEnabled()) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return Response.json({ error: "Missing x-razorpay-signature header." }, { status: 400 });
  }
  // Must be the raw bytes: re-serializing parsed JSON can reorder keys and
  // will not match the HMAC.
  const rawBody = await request.text();
  try {
    await handleRazorpayWebhook(rawBody, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return Response.json({ error: message }, { status: 400 });
  }
  return Response.json({ received: true });
}
