import { asCadence, availableCombinations, type PlanSelection } from "../catalog";
import { getSubscriptionForUser, patchSubscriptionForUser } from "../repo";
import type { SubscriptionPlan, SubscriptionRow } from "../../db/schema";
import { activeSubscriptionRef, planChangeOffers } from "./decide";
import { describeStripePlan } from "./stripe";
import { describeRazorpayPlan } from "./razorpay";
import type {
  ActiveSubscriptionRef,
  PlanChangeOffer,
  ProcessorPlanState,
  ScheduledPlanChange,
} from "./types";

/** What the settings page needs to render the plan surface for a subscriber. */
export interface CurrentPlanState extends ProcessorPlanState {
  processor: ActiveSubscriptionRef["processor"];
  cancelAtPeriodEnd: boolean;
  /** Empty when cadence couldn't be resolved — we will not guess a direction
   *  (and therefore a billing moment) from a plan we can't identify. */
  changes: PlanChangeOffer[];
  /** When a processor last confirmed cadence/renewal/pending. Null = never, so
   *  the surface can say so rather than presenting stale state as current. */
  syncedAt: Date | null;
}

export async function describePlan(ref: ActiveSubscriptionRef): Promise<ProcessorPlanState> {
  return ref.processor === "stripe"
    ? describeStripePlan(ref.subscriptionId)
    : describeRazorpayPlan(ref.subscriptionId);
}

/** Every mutating entry point starts here: no live subscription, no change. */
export function requireActiveRef(sub: SubscriptionRow | null): ActiveSubscriptionRef {
  const ref = activeSubscriptionRef(sub);
  if (!ref) throw new Error("There's no active subscription on this account to change.");
  return ref;
}

/** The (tier, cadence) the customer is on, or null when the processor's
 *  price/plan id isn't one this instance still sells. */
export function currentSelection(
  sub: SubscriptionRow | null,
  state: ProcessorPlanState,
): PlanSelection | null {
  if (!state.cadence) return null;
  if (sub?.plan !== "pro" && sub?.plan !== "power") return null;
  return { plan: sub.plan, cadence: state.cadence };
}

function asTier(value: string | null): SubscriptionPlan | null {
  return value === "pro" || value === "power" ? value : null;
}

function scheduledFromRow(sub: SubscriptionRow): ScheduledPlanChange | null {
  const plan = asTier(sub.scheduledPlan);
  const cadence = asCadence(sub.scheduledCadence);
  // A half-written schedule (a date but no target plan) is not something the UI
  // can describe — "changes on 3 Mar" to what? — so it is no pending line.
  if (!plan || !cadence) return null;
  return { plan, cadence, effectiveAt: sub.scheduledChangeAt };
}

/**
 * The plan surface, built from OUR ROW ALONE. Pure: no DB, no network.
 *
 * This is the whole point of the denormalised columns. `getPlanSummary` — and
 * therefore currentPlan/hasFeature/requireFeature, which run per MCP request,
 * per AI action and per gated control — used to reach a live Stripe/Razorpay
 * API from here. That made every entitlement check a processor round-trip: pure
 * latency, rate-limit exposure, and a payment-processor outage degrading
 * features that have nothing to do with payment. The webhooks now write cadence
 * and any booked change onto the row, and the only place that still asks a
 * processor is reconcilePlanState below.
 */
export function planStateFromRow(sub: SubscriptionRow | null): CurrentPlanState | null {
  const ref = activeSubscriptionRef(sub);
  if (!ref || !sub) return null;
  const cadence = asCadence(sub.cadence);
  const current: PlanSelection | null =
    cadence && (sub.plan === "pro" || sub.plan === "power")
      ? { plan: sub.plan, cadence }
      : null;
  return {
    cadence,
    renewsAt: sub.currentPeriodEnd,
    pending: scheduledFromRow(sub),
    processor: ref.processor,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    changes: current ? planChangeOffers(current, availableCombinations(ref.processor)) : [],
    syncedAt: sub.syncedAt,
  };
}

/** One indexed read, no processor call. Null when nothing is live. */
export async function getCurrentPlanState(userId: string): Promise<CurrentPlanState | null> {
  return planStateFromRow(await getSubscriptionForUser(userId));
}

/**
 * The ONE remaining processor round-trip on the read path, and it is explicit:
 * the user opened the billing settings page, so we ask Stripe/Razorpay what
 * they actually hold and write it back.
 *
 * Deliberately best-effort. A processor outage must not take the settings page
 * (and its cancel button) down with it, so a failure leaves the denormalised
 * copy and its `syncedAt` untouched — the page then renders stale-but-honest
 * state with a visible "last synced" date instead of an error.
 *
 * No background job reconciles this. Drift between webhooks is bounded by the
 * webhooks themselves, and every place a user can SEE or ACT on cadence goes
 * through here first; see the recommendation in the PR notes if that changes.
 */
export async function reconcilePlanState(userId: string): Promise<void> {
  const sub = await getSubscriptionForUser(userId);
  const ref = activeSubscriptionRef(sub);
  if (!ref) return;
  let state: ProcessorPlanState;
  try {
    state = await describePlan(ref);
  } catch (error) {
    // No ids, no PII — just enough to find it in the processor dashboard.
    console.error(`[billing] couldn't reconcile the live ${ref.processor} plan`, error);
    return;
  }
  await patchSubscriptionForUser(userId, {
    // An unresolvable cadence (a price this instance no longer sells) leaves
    // the stored one alone rather than blanking it.
    cadence: state.cadence,
    scheduled: state.pending
      ? { plan: state.pending.plan, cadence: state.pending.cadence, changeAt: state.pending.effectiveAt }
      : null,
    // Never widen the entitlement window: a null renewsAt means "the processor
    // didn't say", not "unlimited" (see upsertSubscription's hazard note).
    ...(state.renewsAt ? { currentPeriodEnd: state.renewsAt } : {}),
    syncedAt: new Date(),
  });
}
