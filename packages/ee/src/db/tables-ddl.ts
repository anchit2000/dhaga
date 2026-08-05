/**
 * EE-owned tables — not part of core's tenant data, so no RLS needed here;
 * these are control-plane tables the admin panel/webhooks read directly.
 */
export const EE_TABLES_DDL = `
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS access_requests (
  email text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  approval_token text
);

-- One-time normalization: the write path now stores email lowercased
-- (access-requests/repo.ts), but pre-existing rows may hold a mixed-case email.
-- Every lookup (isEmailApproved / reviewAccessRequest) matches on lower(email)
-- and Postgres text equality is case-sensitive, so a mixed-case row is
-- unreachable — stuck "pending" forever. Lowercase existing rows to match.
-- email is the PRIMARY KEY, so lowercasing can COLLIDE with another row that
-- already normalizes to the same value (a mixed-case row vs an existing
-- lowercase one, OR two mixed-case variants of each other). Collapse each
-- lower(email) group to one canonical row FIRST — an already-lowercase row
-- wins; otherwise the earliest-requested, tiebroken lexically for determinism —
-- then lowercase the survivors. Idempotent: once every row is lowercase and
-- unique per lower(email), the DELETE finds no rn>1 rows and the UPDATE finds
-- nothing to change, so re-running (on every DDL replay) is a no-op.
DO $$
BEGIN
  DELETE FROM access_requests
  WHERE ctid IN (
    SELECT ctid FROM (
      SELECT ctid,
             row_number() OVER (
               PARTITION BY lower(email)
               ORDER BY (email = lower(email)) DESC, requested_at ASC, email ASC
             ) AS rn
      FROM access_requests
    ) ranked
    WHERE rn > 1
  );
  UPDATE access_requests SET email = lower(email) WHERE email <> lower(email);
END $$;

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
-- Razorpay (INR) checkout alongside Stripe. Additive and idempotent so an
-- instance created before Razorpay existed self-heals on the next DDL replay:
-- the columns are added, and stripe_customer_id stops being mandatory because a
-- Razorpay row has no Stripe customer to name.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS subscriptions_razorpay_payment_id_idx ON subscriptions (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS subscriptions_razorpay_subscription_id_idx ON subscriptions (razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_plan_created_idx ON subscriptions (status, plan, created_at DESC);
CREATE INDEX IF NOT EXISTS access_requests_status_requested_idx ON access_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS ee_user_created_idx ON "user" (created_at DESC);
CREATE INDEX IF NOT EXISTS ee_user_name_trgm_idx ON "user" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ee_user_email_trgm_idx ON "user" USING GIN (email gin_trgm_ops);

-- Two-sided referral program (Dhaga Cloud). Control-plane, same as
-- subscriptions/access_requests — NO RLS (rls-ddl.ts's tenant loop deliberately
-- excludes these; referral reads/writes filter by an explicit user_id/code).
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id text PRIMARY KEY,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id text PRIMARY KEY,
  code text NOT NULL,
  referrer_user_id text NOT NULL,
  referee_user_id text,
  referee_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'blocked')),
  reward_kind text,
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  UNIQUE (code, referee_user_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_user_id_idx ON referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS referrals_referee_user_id_idx ON referrals (referee_user_id);
`;
