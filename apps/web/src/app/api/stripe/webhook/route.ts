// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole api/stripe/** folder; nothing else in the app references it.
import { handleStripeWebhook } from "@dhaga/ee/billing";
import { logActionError } from "@/lib/actions/resilience";

/**
 * Deliberately public — the second auth-exempt route after access-requests.
 * Stripe's signature (verified inside handleStripeWebhook) is the auth.
 */
export async function POST(request: Request): Promise<Response> {
  // Same belt-and-suspenders as api/access-requests — inert unless hosted
  // mode is explicitly on, regardless of whether EE happens to be present.
  if (process.env.DHAGA_HOSTED_MODE !== "true") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }
  const rawBody = await request.text();
  try {
    await handleStripeWebhook(rawBody, signature);
  } catch (error) {
    // The failure has to be visible somewhere: this is a payment grant path, so
    // a swallowed error is a customer who paid and got nothing. It is logged
    // server-side and NOT echoed — the raw message is attacker-reachable (the
    // caller only has to fail signature verification to read it back) and a
    // Postgres constraint violation quotes the conflicting value, which here is
    // the customer's email. 400 is unchanged: Stripe's retry schedule reads it.
    logActionError("stripe-webhook", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 400 });
  }
  return Response.json({ received: true });
}
