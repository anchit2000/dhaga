import type Stripe from "stripe";
import { getStripe } from "../stripe-client";
import { selectionForStripePriceId, stripePriceId, type PlanSelection } from "../catalog";
import type { PlanChangeTiming, ProcessorPlanState, ScheduledPlanChange } from "./types";

/**
 * Stripe half of the plan-change lifecycle. Every path here MODIFIES the
 * existing subscription — nothing in this file creates one.
 *
 * A scheduled change is a Subscription Schedule with two phases: the phase the
 * customer already paid for, then the new price. `end_behavior: "release"`
 * detaches the subscription once the second phase starts, so it keeps renewing
 * normally at the new price instead of ending.
 */

function seconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function priceIdOf(item: { price: Stripe.Price | Stripe.DeletedPrice | string }): string {
  return typeof item.price === "string" ? item.price : item.price.id;
}

function scheduleIdOf(sub: Stripe.Subscription): string | null {
  if (!sub.schedule) return null;
  return typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id;
}

async function retrieve(subscriptionId: string): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

/** The phase that has started but not yet ended — the one the customer is
 *  living in. Stripe requires it to be replayed verbatim on every update. */
function currentPhase(schedule: Stripe.SubscriptionSchedule): Stripe.SubscriptionSchedule.Phase {
  const now = seconds(new Date());
  return (
    schedule.phases.find((p) => p.start_date <= now && (p.end_date === null || p.end_date > now)) ??
    schedule.phases[0]
  );
}

function pendingFrom(schedule: Stripe.SubscriptionSchedule | null): ScheduledPlanChange | null {
  if (!schedule) return null;
  const now = seconds(new Date());
  const next = schedule.phases.find((p) => p.start_date > now);
  const priceId = next?.items[0] ? priceIdOf(next.items[0]) : null;
  const selection = priceId ? selectionForStripePriceId(priceId) : null;
  if (!next || !selection) return null;
  return { ...selection, effectiveAt: new Date(next.start_date * 1000) };
}

/** Cadence + renewal date + any booked change, as Stripe currently holds them. */
export async function describeStripePlan(subscriptionId: string): Promise<ProcessorPlanState> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId, { expand: ["schedule"] });
  const item = sub.items.data[0];
  const selection = item ? selectionForStripePriceId(priceIdOf(item)) : null;
  const schedule = typeof sub.schedule === "object" ? sub.schedule : null;
  return {
    cadence: selection?.cadence ?? null,
    renewsAt: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    pending: pendingFrom(schedule),
  };
}

/**
 * Drops any booked change. Releasing also un-blocks a direct item update:
 * Stripe refuses to edit the items of a schedule-managed subscription, so an
 * upgrade that supersedes a pending downgrade has to release first.
 */
async function release(sub: Stripe.Subscription): Promise<void> {
  const scheduleId = scheduleIdOf(sub);
  if (scheduleId) await getStripe().subscriptionSchedules.release(scheduleId);
}

export async function clearStripeScheduledChange(subscriptionId: string): Promise<void> {
  await release(await retrieve(subscriptionId));
}

export async function changeStripePlan(
  subscriptionId: string,
  selection: PlanSelection,
  timing: PlanChangeTiming,
): Promise<void> {
  const stripe = getStripe();
  const sub = await retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error("That Stripe subscription has no line item to change.");
  const price = stripePriceId(selection.plan, selection.cadence);
  // Whichever way this goes it replaces any change already booked, and a
  // pending cancellation is contradicted by choosing a new plan — picking one
  // means staying.
  await release(sub);

  if (timing === "immediate") {
    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: item.id, price }],
      // The upgrade path only. Stripe credits the unused remainder of the old
      // price and charges the new one pro rata, so the customer is never
      // billed twice for the same days.
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
    });
    return;
  }

  const periodEnd = item.current_period_end;
  if (!periodEnd) throw new Error("That Stripe subscription has no period end to schedule against.");
  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
  const phase = currentPhase(schedule);
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        items: phase.items.map((i) => ({ price: priceIdOf(i), quantity: i.quantity ?? 1 })),
        start_date: phase.start_date,
        end_date: phase.end_date ?? periodEnd,
      },
      // One cycle on the new price, then `end_behavior: "release"` detaches the
      // subscription and it renews on its own at that price. The duration is
      // required: a final phase with no end never releases, and a schedule that
      // simply ended would cancel the customer instead of switching them.
      {
        items: [{ price, quantity: 1 }],
        duration: { interval: selection.cadence === "yearly" ? "year" : "month", interval_count: 1 },
        proration_behavior: "none",
      },
    ],
  });
}

/**
 * Cancel at the renewal boundary — never immediately. The customer keeps what
 * they paid for; we owe no refund. Any booked change is released first, since
 * a plan they are leaving is not worth switching them onto.
 */
export async function cancelStripePlan(subscriptionId: string): Promise<Date | null> {
  const sub = await retrieve(subscriptionId);
  await release(sub);
  const updated = await getStripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  const ts = updated.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

export async function resumeStripePlan(subscriptionId: string): Promise<void> {
  await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}
