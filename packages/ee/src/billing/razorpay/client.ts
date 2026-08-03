import Razorpay from "razorpay";
import { getRazorpayCredentials } from "./config";

let client: Razorpay | undefined;

function getClient(): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

/**
 * The subset of a Razorpay order this integration relies on. Declared locally
 * rather than re-exporting the SDK's type so the SDK stays swappable for a
 * plain fetch against api.razorpay.com (and so `notes` is narrowed to the two
 * keys we actually set) — same reason billing/index.ts owns its own
 * PlanSummary rather than leaking Stripe types.
 */
export interface RazorpayOrder {
  id: string;
  amountPaise: number;
  currency: string;
  /** 'created' | 'attempted' | 'paid' — only 'paid' may grant an entitlement. */
  status: string;
  userId: string | null;
  plan: string | null;
}

function toOrder(raw: {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  // Razorpay types note values as nullable, so `note()` below narrows rather
  // than assuming a string is there.
  notes?: Record<string, string | number | null> | null;
}): RazorpayOrder {
  const note = (key: string): string | null => {
    const value = raw.notes?.[key];
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
  };
  return {
    id: raw.id,
    amountPaise: Number(raw.amount),
    currency: raw.currency,
    status: raw.status,
    userId: note("userId"),
    plan: note("plan"),
  };
}

/**
 * `notes` carries the userId/plan binding. It is the ONLY reason the verify
 * step can trust what was bought: the browser sends back an order id, and we
 * re-fetch the order from Razorpay to learn whose it was and which plan it
 * paid for, instead of believing a client-supplied plan.
 */
export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  userId: string;
  plan: string;
}): Promise<RazorpayOrder> {
  const order = await getClient().orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: { userId: input.userId, plan: input.plan },
  });
  return toOrder(order);
}

export async function fetchOrder(orderId: string): Promise<RazorpayOrder> {
  return toOrder(await getClient().orders.fetch(orderId));
}
