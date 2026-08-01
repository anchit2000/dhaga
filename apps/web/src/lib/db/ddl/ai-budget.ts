/**
 * Instance-wide AI budget controls and the credit-grant ledger. Kept separate
 * from core/meta.ts the same way auth/search/calendar/geocode DDL is
 * (concatenated in ./index.ts). Idempotent, boot-time applied — the project's
 * "boring migrations" convention.
 *
 * TENANCY, and why these two tables differ from `settings`:
 *
 * `ai_budget_settings` is DELIBERATELY INSTANCE-WIDE, never tenant-scoped. It
 * holds the operator's own configuration — is plan-cap enforcement on, what
 * allowance does each plan get, is a promotional month running — which is a
 * property of the deployment, not of a user. Putting it in `settings` would be
 * actively wrong: packages/ee re-keys that table to (user_id, key) and RLS-scopes
 * it, so an instance-wide value written by one admin would be INVISIBLE to every
 * other user's connection, and metering would silently read "unset" and fall back
 * to the default for everyone but the admin who set it. That is the geocode_cache
 * failure mode (see ./geocode.ts) — a scoping mistake that fails silently rather
 * than loudly. Neither table is in packages/ee's TENANT_TABLES.
 *
 * `ai_credit_grants` is the additive make-good ledger. A grant row is either for
 * ONE user (`user_id` set) or for EVERY user on the instance (`user_id` NULL),
 * and that NULL is exactly why the table cannot join the generic TENANT_TABLES
 * loop: the shared `tenant_isolation` policy is `user_id = current_setting(...)`,
 * which hides a NULL row from everybody — an instance-wide grant would apply to
 * nobody, silently. packages/ee therefore gives this table its own policy
 * (`user_id IS NULL OR user_id = <tenant>`), the same bespoke treatment `settings`
 * already gets there. A self-hosted (AGPL, no packages/ee) build has no RLS at
 * all and no admin UI to write grants, so the table simply stays empty.
 *
 * WHY A LEDGER AND NOT A COUNTER: `ai_actions` is the only record of what cloud
 * AI actually cost, so making a user whole after a bug must never touch it. A
 * grant is a separate, additive row carrying who granted it, when, how many
 * credits and why — usage stays intact and auditable, and the grant is auditable
 * too.
 */
export const AI_BUDGET_DDL = `
CREATE TABLE IF NOT EXISTS ai_budget_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_credit_grants (
  id text PRIMARY KEY,
  -- NULL = every user on this instance. Set = that one user.
  user_id text,
  credits integer NOT NULL,
  -- Free text an admin must supply: "make-good for the 2026-07 extraction bug".
  -- Required so a grant is never an unexplained number in the ledger.
  reason text NOT NULL,
  -- The admin user id that created the grant.
  granted_by text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  -- NULL = never expires. A grant with no end date re-applies every month, so
  -- the admin UI defaults a make-good to the end of the current month.
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_credit_grants_credits_positive_ck CHECK (credits > 0)
);

-- Every read filters on (user_id IS NULL OR user_id = me) plus the active window.
CREATE INDEX IF NOT EXISTS ai_credit_grants_user_id_idx ON ai_credit_grants (user_id);
-- The admin ledger page reads newest-first.
CREATE INDEX IF NOT EXISTS ai_credit_grants_created_idx ON ai_credit_grants (created_at DESC);
`;
