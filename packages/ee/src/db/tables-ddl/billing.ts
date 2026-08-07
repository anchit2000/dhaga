/**
 * The subscription row and the payment ledger.
 *
 * Both are control-plane tables with NO RLS (rls-ddl.ts's tenant loop
 * deliberately excludes them); every read filters by an explicit user_id or
 * processor id. Everything here is additive and idempotent so an instance
 * created before any of it existed self-heals on the next DDL replay.
 */
export const SUBSCRIPTIONS_DDL = `
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text,
  plan text NOT NULL,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Razorpay (INR) checkout alongside Stripe: the columns are added, and
-- stripe_customer_id stops being mandatory because a Razorpay row has no Stripe
-- customer to name.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;
-- Denormalised plan state. These five columns exist so an entitlement check is
-- a DB read and never a Stripe/Razorpay round-trip; the webhooks write them and
-- synced_at records when a processor last confirmed them. See the REVERSED
-- DECISION note on \`subscriptions.cadence\` in ../schema.ts. Nullable
-- throughout: a row written before this shipped simply reads "never synced", and
-- the settings page's explicit reconcile fills it in.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cadence text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scheduled_plan text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scheduled_cadence text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scheduled_change_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS synced_at timestamptz;
CREATE INDEX IF NOT EXISTS subscriptions_razorpay_payment_id_idx ON subscriptions (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS subscriptions_razorpay_subscription_id_idx ON subscriptions (razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_plan_created_idx ON subscriptions (status, plan, created_at DESC);
`;

/**
 * One row per claimed Founding Pro seat.
 *
 * `seat_no` UNIQUE is the CAP ENFORCEMENT, not decoration: the claim is a
 * single INSERT … SELECT max(seat_no)+1 … ON CONFLICT DO NOTHING, so two
 * buyers racing for the last seat both compute the same number and the index
 * decides which one gets it (billing/founding/repo.ts). A read-then-write
 * "count < 500" check would let both through.
 *
 * user_id is the PRIMARY KEY, so re-opening checkout re-uses the seat already
 * held rather than burning a second one.
 */
export const FOUNDING_SEATS_DDL = `
CREATE TABLE IF NOT EXISTS founding_seats (
  user_id text PRIMARY KEY,
  seat_no integer NOT NULL UNIQUE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
`;

/**
 * One row per CHARGE, on either processor.
 *
 * `processor_payment_id` UNIQUE is the IDEMPOTENCY MECHANISM, not merely a
 * constraint: both processors deliver at-least-once and the Razorpay confirm
 * path races its own webhook, so every writer is an INSERT … ON CONFLICT
 * (processor_payment_id) DO UPDATE (billing/payments/repo.ts) rather than a
 * read-then-write that two concurrent deliveries would both win.
 *
 * `amount_minor` is INTEGER minor units (paise/cents). Never numeric, never a
 * float: a settlement reconciliation that compares rounded decimals is not a
 * reconciliation. Nullable because a row can legitimately predate its amount
 * (the backfill below, or a confirm whose payment fetch failed) — null means
 * "never learned", which must stay distinguishable from a real zero.
 */
export const PAYMENTS_DDL = `
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  processor text NOT NULL CHECK (processor IN ('stripe', 'razorpay')),
  processor_payment_id text NOT NULL UNIQUE,
  processor_subscription_id text,
  amount_minor integer,
  currency text,
  status text NOT NULL CHECK (status IN ('captured', 'refunded', 'partially_refunded', 'disputed', 'failed')),
  plan text,
  cadence text,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_user_id_occurred_idx ON payments (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS payments_processor_subscription_id_idx ON payments (processor_subscription_id);

-- BACKFILL, exactly once. Refund/chargeback revocation now resolves the account
-- through this ledger (approval/repo.ts), so every payment id we already hold
-- must be IN it — otherwise a refund of a pre-ledger charge silently resolves to
-- nobody and a refunded account keeps its access. The only pre-ledger record is
-- the single razorpay_payment_id scalar on the subscription row, so that is what
-- seeds it. Same one-shot marker pattern as backfill-user-approval-v1 in
-- ./access.ts: this whole DDL string replays whenever its text changes, and an
-- ungated INSERT would re-fire on every unrelated schema edit.
--
-- amount/currency/cadence are left NULL on purpose — the processor was never
-- asked what those charges were, and inventing 0/INR would poison the very
-- reconciliation this table exists for. occurred_at falls back to the row's
-- updated_at, the closest timestamp we actually have. The NOT EXISTS guard makes
-- the statement safe even if the marker were ever cleared by hand.
WITH applied AS (
  INSERT INTO dhaga_ee_migrations (id)
  VALUES ('backfill-payments-from-subscriptions-v1')
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO payments (id, user_id, processor, processor_payment_id, processor_subscription_id, status, plan, occurred_at)
SELECT
  'backfill:' || s.razorpay_payment_id,
  s.user_id,
  'razorpay',
  s.razorpay_payment_id,
  s.razorpay_subscription_id,
  'captured',
  s.plan,
  s.updated_at
FROM subscriptions s
WHERE s.razorpay_payment_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM applied)
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.processor_payment_id = s.razorpay_payment_id)
ON CONFLICT DO NOTHING;
`;
