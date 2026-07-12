/**
 * better-auth-owned tables. Column shapes (including which columns get a DB
 * default vs. rely on the adapter always supplying a value) come verbatim
 * from `npx @better-auth/cli generate` — see ../schema/auth.ts and
 * ../schema/api-key.ts for the matching Drizzle definitions. No `timestamptz`
 * here, unlike ./core.ts, to match the CLI's own generated column types.
 */
export const AUTH_DDL = `
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  two_factor_enabled boolean DEFAULT false,
  username text,
  display_username text,
  phone_number text,
  phone_number_verified boolean,
  is_admin boolean DEFAULT false
);
-- Plugin-owned user columns, added via ALTER for databases created before the
-- twoFactor/username/phoneNumber plugins existed (fresh installs get them from
-- the CREATE TABLE above; both paths are idempotent).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS display_username text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone_number_verified boolean;
CREATE UNIQUE INDEX IF NOT EXISTS user_username_uq ON "user" (username);
CREATE UNIQUE INDEX IF NOT EXISTS user_phoneNumber_uq ON "user" (phone_number);

-- Email verification was introduced after accounts already existed. Mark the
-- users present at rollout as verified exactly once so enabling the stricter
-- Better Auth policy cannot lock out an existing, demo, or bootstrap-admin
-- account. Fresh databases record the migration before their first signup,
-- so all future password accounts must verify normally.
CREATE TABLE IF NOT EXISTS dhaga_auth_migrations (
  id text PRIMARY KEY,
  applied_at timestamp NOT NULL DEFAULT now()
);
WITH applied AS (
  INSERT INTO dhaga_auth_migrations (id)
  VALUES ('grandfather-email-verification-v1')
  ON CONFLICT DO NOTHING
  RETURNING id
)
UPDATE "user"
SET email_verified = true, updated_at = now()
WHERE email_verified = false
  AND EXISTS (SELECT 1 FROM applied);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  expires_at timestamp NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_userId_idx ON session (user_id);

CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS account_userId_idx ON account (user_id);

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

CREATE TABLE IF NOT EXISTS apikey (
  id text PRIMARY KEY,
  config_id text NOT NULL DEFAULT 'default',
  name text,
  start text,
  reference_id text NOT NULL,
  prefix text,
  key text NOT NULL,
  refill_interval integer,
  refill_amount integer,
  last_refill_at timestamp,
  enabled boolean DEFAULT true,
  rate_limit_enabled boolean DEFAULT true,
  rate_limit_time_window integer DEFAULT 86400000,
  rate_limit_max integer DEFAULT 10,
  request_count integer DEFAULT 0,
  remaining integer,
  last_request timestamp,
  expires_at timestamp,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL,
  permissions text,
  metadata text
);
CREATE INDEX IF NOT EXISTS "apikey_configId_idx" ON apikey (config_id);
CREATE INDEX IF NOT EXISTS "apikey_referenceId_idx" ON apikey (reference_id);
CREATE INDEX IF NOT EXISTS apikey_key_idx ON apikey (key);

CREATE TABLE IF NOT EXISTS passkey (
  id text PRIMARY KEY,
  name text,
  public_key text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  counter integer NOT NULL,
  device_type text NOT NULL,
  backed_up boolean NOT NULL,
  transports text,
  created_at timestamp,
  aaguid text
);
CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON passkey (user_id);
CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx" ON passkey (credential_id);

CREATE TABLE IF NOT EXISTS two_factor (
  id text PRIMARY KEY,
  secret text NOT NULL,
  backup_codes text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verified boolean DEFAULT true,
  failed_verification_count integer DEFAULT 0,
  locked_until timestamp
);
CREATE INDEX IF NOT EXISTS "twoFactor_secret_idx" ON two_factor (secret);
CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON two_factor (user_id);
`;
