// Dhaga Cloud only — see packages/ee/LICENSE. Self-hosters can delete this
// whole api/razorpay/** folder; nothing else in the app references it.
import { createRazorpayCheckout, parsePlanSelection, razorpayEnabled } from "@dhaga/ee/billing";
import { requireUserIdFromRequest } from "@/lib/auth/guard";

/**
 * Creates the Razorpay Subscription the browser then opens the checkout modal
 * against.
 *
 * The request body carries a PLAN and CADENCE, never an amount. Razorpay is
 * happy to create a 100-paise charge, so accepting a client-supplied amount
 * here — as the generic integration snippets do — would let anyone buy Pro for
 * one rupee. Price and cadence both live in the Razorpay Plan.
 */
export async function POST(request: Request): Promise<Response> {
  // Same belt-and-suspenders as api/stripe — inert unless hosted mode is
  // explicitly on, regardless of whether EE happens to be present.
  if (process.env.DHAGA_HOSTED_MODE !== "true" || !razorpayEnabled()) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const selection = parsePlanSelection(body);
  if (!selection) {
    return Response.json(
      { error: "Body must be { plan: 'pro'|'power', cadence: 'monthly'|'yearly' }." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await createRazorpayCheckout(userId, selection));
  } catch (error) {
    // Never echo the Razorpay error text: a misconfigured key pair surfaces
    // there, and this response is client-visible.
    console.error("[razorpay] order creation failed", error);
    return Response.json({ error: "Couldn't start checkout." }, { status: 500 });
  }
}
