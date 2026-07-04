/**
 * EE-owned tables — not part of core's tenant data, so no RLS needed here;
 * these are control-plane tables the admin panel/webhooks read directly.
 */
export const EE_TABLES_DDL = `
CREATE TABLE IF NOT EXISTS access_requests (
  email text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  approval_token text
);

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
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON subscriptions (stripe_subscription_id);
`;
