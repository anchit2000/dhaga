/**
 * Two-sided referral program (Dhaga Cloud). Control-plane, same as
 * subscriptions/access_requests — NO RLS (rls-ddl.ts's tenant loop deliberately
 * excludes these; referral reads/writes filter by an explicit user_id/code).
 */
export const REFERRALS_DDL = `
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
