import type { SubscriptionStatus } from "../../db/schema";
import { upsertSubscription } from "../repo";
import { getRazorpayWebhookSecret } from "./config";
import { isValidWebhookSignature } from "./verify";

/**
 * Maps Razorpay's subscription-status set onto the four statuses this app
 * stores. Entitlement (hasUnlimitedAi, billing/index.ts) is granted only for
 * `active`, so an entitlement-preserving status MUST land on `active` here.
 *
 * The two that are easy to get wrong:
 *   - `authenticated` means the mandate is approved but no money has moved.
 *     That is NOT an entitlement — it maps to `incomplete`, or a user could
 *     approve a mandate, cancel, and keep Pro.
 *   - `completed` means the plan ran its full total_count, not that something
 *     failed. There is nothing left to charge, so the entitlement ends.
 *
 * Keyed exhaustively so a status Razorpay adds later fails loudly at the
 * lookup rather than silently defaulting to something generous.
 */
export const RAZORPAY_STATUS_TO_STORED: Record<string, SubscriptionStatus> = {
  created: "incomplete",
  authenticated: "incomplete", // mandate approved, nothing charged yet
  active: "active",
  pending: "past_due", // a charge failed; Razorpay is retrying
  halted: "past_due", // retries exhausted, may still be revived
  cancelled: "canceled",
  completed: "canceled", // ran to the end of total_count
  expired: "canceled",
};

interface SubscriptionEntity {
  id: string;
  status: string;
  current_end?: number | null;
  notes?: Record<string, string | number | null> | null;
}

interface RazorpayEvent {
  event?: string;
  payload?: { subscription?: { entity?: SubscriptionEntity } };
}

function userIdFrom(notes: Record<string, string | number | null> | null | undefined): string | null {
  const value = notes?.userId;
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/**
 * Verifies the Razorpay signature itself (this route has no session — the
 * signature IS the auth) and writes to the DB before returning, so retries on
 * a slow response don't race a "succeeded but not recorded" state.
 *
 * This is the reliable half of the integration. /api/razorpay/verify depends on
 * the buyer's browser surviving the redirect back; this does not, so a customer
 * who pays and immediately closes the tab still gets what they paid for. Every
 * handler is an idempotent upsert keyed on userId, safe for redelivery.
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string): Promise<void> {
  if (!isValidWebhookSignature({ rawBody, signature, webhookSecret: getRazorpayWebhookSecret() })) {
    throw new Error("Invalid Razorpay webhook signature.");
  }
  const event = JSON.parse(rawBody) as RazorpayEvent;

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed": {
      const entity = event.payload?.subscription?.entity;
      if (!entity) break;
      const userId = userIdFrom(entity.notes);
      const status = RAZORPAY_STATUS_TO_STORED[entity.status];
      // An unrecognised status is not an excuse to guess: skip rather than
      // grant or revoke on a value this code has never seen.
      if (!userId || !status) break;
      // Tier from the notes stamped at creation, same binding the confirm path
      // trusts. Anything unrecognised is not silently promoted to Pro.
      const tier = entity.notes?.plan === "power" ? "power" : "pro";
      await upsertSubscription({
        userId,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        razorpaySubscriptionId: entity.id,
        plan: tier,
        status,
        currentPeriodEnd: entity.current_end ? new Date(entity.current_end * 1000) : null,
      });
      break;
    }
    default:
      break;
  }
}
