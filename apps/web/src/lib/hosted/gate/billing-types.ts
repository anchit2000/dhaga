import type { DhagaDb } from "@/lib/db";

/**
 * Billing half of the open-core gate contract. Split out of ./types under the
 * 150-line rule; ./types re-exports it so `@/lib/hosted/gate` and `./types`
 * import paths are unchanged.
 */
/**
 * `founding_yearly` is a limited first-purchase price on the Pro tier, not a
 * tier and not a rung on the monthly/yearly ladder — see FoundingOffer below.
 * It appears here because a founding subscriber's row genuinely carries it.
 */
export type BillingCadence = "monthly" | "yearly" | "founding_yearly";

/** A buyable combination. Every plan is recurring, so a cadence is required. */
export interface PlanOffer {
  plan: "pro" | "power";
  cadence: BillingCadence;
}

/**
 * Founding Pro, when it is still on sale. Null from the gate means "don't show
 * it" — unconfigured, no Razorpay, or the seats are gone — and the caller then
 * renders standard Pro alone.
 *
 * `seatsRemaining` MUST NOT BE RENDERED TO A CUSTOMER. Two reasons, and the
 * second is why it is a rule rather than a preference. It is not authoritative:
 * the seat claim inside EE's Razorpay checkout is, which is where a "sold out"
 * error comes from, and this number can be stale by the time the button is
 * clicked. And it is commercially self-defeating — "500 of the first 500 seats
 * left" tells every visitor that nobody has bought anything. Public surfaces
 * quote `seatCap` and nothing else; admins read the claimed total on
 * /app/admin (dashboardCounts). This field exists so the gate can decide
 * whether the offer is on sale at all.
 */
export interface FoundingOffer {
  plan: "pro";
  cadence: "founding_yearly";
  seatCap: number;
  seatsRemaining: number;
}

/**
 * A change an existing subscriber may make, pre-classified by EE. `direction`
 * and `timing` are computed server-side on purpose: the upgrade/downgrade rule
 * decides whether money moves today, so the browser must render the label from
 * the same evaluation the server will act on, never re-derive it.
 */
export interface PlanChangeOffer extends PlanOffer {
  direction: "upgrade" | "downgrade" | "unchanged";
  timing: "immediate" | "period_end";
}

/**
 * The live subscription, read from OUR OWN ROW. Cadence and any booked change
 * are denormalised onto it by the billing webhooks precisely so an entitlement
 * check is never a payment-processor round-trip — see getPlanSummary below.
 * `syncedAt` is the honesty valve on that trade: it says when a processor last
 * confirmed these values, so the UI can show drift instead of hiding it.
 */
export interface CurrentPlanState {
  processor: "stripe" | "razorpay";
  cadence: BillingCadence | null;
  renewsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  /** A change already booked at the processor but not yet in effect. */
  pending: { plan: "pro" | "power"; cadence: BillingCadence; effectiveAt: Date | null } | null;
  changes: PlanChangeOffer[];
  /** Null = a processor has never confirmed this row's plan state. */
  syncedAt: Date | null;
}

export interface PlanSummary {
  plan: "free" | "pro" | "power";
  status: string | null;
  hasStripeCustomer: boolean;
  /** Null when nothing is live: a free account, a cancelled one, an admin comp,
   *  or a processor we couldn't reach. The UI then falls back to `offers`. */
  current: CurrentPlanState | null;
  /** Which processors this instance actually has keys for. An instance may
   *  sell through either or both, so the settings UI renders a checkout
   *  control only for the ones that would work. */
  stripeEnabled: boolean;
  razorpayEnabled: boolean;
  /** Only the combinations with a configured price id, per processor — the UI
   *  must never offer a button whose price env var is missing. */
  offers: { stripe: PlanOffer[]; razorpay: PlanOffer[] };
}

export interface BillingGate {
  /** Pass the request's already-scoped connection so the entitlement read
   *  reuses it instead of opening a second checkout from the small tenant pool
   *  (the AI-metering hot path — see lib/ai/metering). Optional: callers off
   *  the hot path (e.g. settings render) may omit it. */
  hasUnlimitedAi(userId: string, db?: DhagaDb): Promise<boolean>;
  /**
   * Null in core-only mode — the settings page renders no billing UI at
   * all when this is null, so self-hosters never see a "buy" button for a
   * product not for sale on their instance.
   *
   * DB-ONLY, and that is a contract, not an implementation detail: currentPlan
   * / hasFeature / requireFeature (lib/entitlements) sit on top of this and run
   * per MCP request, per AI action and per gated control. A processor call here
   * would put a Stripe/Razorpay round-trip — and a Stripe/Razorpay outage — on
   * every one of those paths. Anything that genuinely needs live processor
   * state calls `reconcilePlan` instead, explicitly.
   */
  getPlanSummary(userId: string): Promise<PlanSummary | null>;
  /**
   * Founding Pro's availability, or null when the offer must not be shown.
   *
   * Deliberately NOT a field on PlanSummary: that call is on the entitlement
   * hot path and is held to one indexed read, while this one counts claimed
   * seats. Only the three surfaces that actually render the offer pay for it.
   */
  getFoundingOffer(): Promise<FoundingOffer | null>;
  /**
   * What this instance can sell, with NO user in hand — the same
   * `{ stripe, razorpay }` shape `getPlanSummary().offers` carries, minus the
   * subscription read.
   *
   * Exists for the public /pricing page, which has to know which currency it
   * will actually charge in before it can label the other one as an
   * approximation. It resolves through `chargingProcessor` (lib/billing/
   * display-currency), exactly like the in-app picker, so the marketing page
   * and the settings page can never quote different currencies. Config only —
   * no database, no processor call.
   */
  getSaleOffers(): Promise<{ stripe: PlanOffer[]; razorpay: PlanOffer[] }>;
  /**
   * The ONE deliberate processor round-trip on the read path: re-reads cadence,
   * renewal date and any booked change from Stripe/Razorpay and writes them
   * back, refreshing `CurrentPlanState.syncedAt`. Called only when a user opens
   * the billing settings page. Best-effort — a processor outage leaves the
   * stored copy (and its older syncedAt) in place rather than failing the page.
   */
  reconcilePlan(userId: string): Promise<void>;
  /** New subscriptions only. Throws for an account that already has a live one
   *  — a second subscription would bill the same customer twice. */
  createCheckoutUrl(userId: string, selection: PlanOffer): Promise<string>;
  createPortalUrl(userId: string): Promise<string>;
  /** Modifies the EXISTING subscription in place. Upgrades apply immediately
   *  and the processor settles the difference; downgrades wait for the renewal
   *  boundary, since applying one now would owe the customer a refund. */
  changePlan(userId: string, selection: PlanOffer): Promise<unknown>;
  /** Cancel at the renewal boundary — never immediately, so nothing is owed
   *  back. */
  cancelPlan(userId: string): Promise<unknown>;
  /** Undo a pending cancellation. Stripe only; Razorpay has no resume API. */
  resumePlan(userId: string): Promise<void>;
  /** Drop a booked plan change before it lands. */
  revertScheduledChange(userId: string): Promise<void>;
}
