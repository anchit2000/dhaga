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
  is_admin boolean DEFAULT false
);

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
`;
