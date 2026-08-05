import Razorpay from "razorpay";
import { getRazorpayCredentials } from "./config";

let client: Razorpay | undefined;

function getClient(): Razorpay {
  const { keyId, keySecret } = getRazorpayCredentials();
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

/**
 * Razorpay has no "bill until cancelled": `total_count` is mandatory and the
 * subscription simply completes once it is reached. Ten years is a horizon
 * long enough that nobody hits it in practice, chosen instead of an arbitrary
 * env var nobody would revisit — and derived from the plan's own period so a
 * monthly plan doesn't quietly stop after ten charges.
 */
const SUBSCRIPTION_HORIZON_YEARS = 10;

const CYCLES_PER_YEAR: Record<string, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  yearly: 1,
};

function note(notes: Record<string, string | number | null> | null | undefined, key: string): string | null {
  const value = notes?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/**
 * The subsets of Razorpay's objects this integration relies on. Declared
 * locally rather than re-exporting the SDK's types so the SDK stays swappable
 * for plain fetch against api.razorpay.com — same reason billing/index.ts owns
 * its own PlanSummary rather than leaking Stripe types.
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

export interface RazorpaySubscription {
  id: string;
  /** created | authenticated | active | pending | halted | cancelled | completed | expired */
  status: string;
  planId: string;
  /** End of the paid period, or null before the first charge lands. */
  currentEnd: Date | null;
  userId: string | null;
}

function toOrder(raw: {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  notes?: Record<string, string | number | null> | null;
}): RazorpayOrder {
  return {
    id: raw.id,
    amountPaise: Number(raw.amount),
    currency: raw.currency,
    status: raw.status,
    userId: note(raw.notes, "userId"),
    plan: note(raw.notes, "plan"),
  };
}

function toSubscription(raw: {
  id: string;
  status: string;
  plan_id: string;
  current_end?: number | null;
  notes?: Record<string, string | number | null> | null;
}): RazorpaySubscription {
  return {
    id: raw.id,
    status: raw.status,
    planId: raw.plan_id,
    currentEnd: raw.current_end ? new Date(raw.current_end * 1000) : null,
    userId: note(raw.notes, "userId"),
  };
}

/**
 * `notes` carries the userId binding. It is the ONLY reason the verify step can
 * trust whose payment this was: the browser sends back an id, and we re-fetch
 * the object from Razorpay to learn who it belonged to, instead of believing a
 * client-supplied user.
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

export async function createSubscription(input: {
  planId: string;
  userId: string;
  tier: string;
}): Promise<RazorpaySubscription> {
  // Read the plan's period so total_count spans the same wall-clock horizon
  // whatever cadence the dashboard is set to.
  const plan = await getClient().plans.fetch(input.planId);
  const perYear = CYCLES_PER_YEAR[String(plan.period)] ?? 12;
  const subscription = await getClient().subscriptions.create({
    plan_id: input.planId,
    total_count: perYear * SUBSCRIPTION_HORIZON_YEARS,
    customer_notify: 1,
    notes: { userId: input.userId, plan: input.tier },
  });
  return toSubscription(subscription);
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return toSubscription(await getClient().subscriptions.fetch(subscriptionId));
}
