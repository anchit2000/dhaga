// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole api/razorpay/** folder; nothing else in the app references it.
import { confirmRazorpayPayment, razorpayEnabled } from "@dhaga/ee/billing";
import { requireUserIdFromRequest } from "@/lib/auth/guard";

/**
 * Verifies the checkout handler's signature and grants the plan.
 *
 * Unlike the Stripe webhook — where the signature IS the auth because there is
 * no session — this route is called by the buyer's own browser, so it needs
 * BOTH: the session says who is asking, the signature says money actually
 * moved. Neither alone is sufficient, and the entitlement is written only
 * after confirmRazorpayPayment re-reads the order from Razorpay.
 *
 * This is the FAST path, not the authoritative one: /api/razorpay/webhook
 * writes the same rows server-to-server, so a customer who pays and closes the
 * tab before this fires still gets what they paid for. Both are idempotent
 * upserts keyed on userId — whichever lands first wins and the other re-writes
 * the same values.
 */
export async function POST(request: Request): Promise<Response> {
  if (process.env.DHAGA_HOSTED_MODE !== "true" || !razorpayEnabled()) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  const subscriptionId = body?.razorpay_subscription_id;
  if (
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    typeof subscriptionId !== "string"
  ) {
    return Response.json(
      {
        error:
          "razorpay_payment_id, razorpay_subscription_id and razorpay_signature are required.",
      },
      { status: 400 },
    );
  }

  let result: Awaited<ReturnType<typeof confirmRazorpayPayment>>;
  try {
    result = await confirmRazorpayPayment(userId, { subscriptionId, paymentId, signature });
  } catch (error) {
    console.error("[razorpay] payment confirmation failed", error);
    return Response.json({ error: "Couldn't confirm payment." }, { status: 500 });
  }

  if (!result.ok) {
    // 400 for every rejection, and deliberately no detail about WHICH check
    // failed — that would tell someone probing the endpoint how close a forged
    // payload got. The reason is logged server-side instead.
    console.warn("[razorpay] rejected payment confirmation", { reason: result.reason });
    return Response.json({ error: "Payment could not be verified." }, { status: 400 });
  }

  // `active: false` is a success: an approved mandate whose first charge
  // hasn't settled. The client says "activating" rather than "active", and
  // subscription.charged flips it via the webhook.
  return Response.json({ success: true, plan: result.plan, active: result.active });
}
