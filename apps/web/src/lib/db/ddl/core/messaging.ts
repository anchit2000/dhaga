/**
 * Inbound-messaging capture tables. Depends on nothing in graph.ts, so this
 * chunk is appended after META_DDL. Column names stay in lockstep with the
 * Drizzle definitions in db/schema/messaging.ts.
 *
 * Routing-vs-tenant split (see schema/messaging.ts): identities and
 * link_tokens carry an explicit user_id (the webhook resolves the owner BEFORE
 * any tenant scope); sessions and session_items get their user_id + RLS from
 * packages/ee/src/db/rls-ddl.ts. session_items references sessions, so the
 * sessions table is created first.
 */
export const MESSAGING_DDL = `
CREATE TABLE IF NOT EXISTS messaging_identities (
  id text PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  external_name text,
  user_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

-- One identity per (channel, sender). The webhook resolves the owning user by
-- this pair before any tenant scope exists, so it must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS messaging_identities_provider_external_idx ON messaging_identities (provider, external_id);
CREATE INDEX IF NOT EXISTS messaging_identities_user_idx ON messaging_identities (user_id);

CREATE TABLE IF NOT EXISTS messaging_link_tokens (
  token text PRIMARY KEY,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS messaging_link_tokens_user_idx ON messaging_link_tokens (user_id);

CREATE TABLE IF NOT EXISTS messaging_sessions (
  id text PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  last_item_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The webhook looks up an open batch for an incoming sender by (provider,
-- external_id, status); the idle-flush job scans open batches by last activity.
CREATE INDEX IF NOT EXISTS messaging_sessions_open_idx ON messaging_sessions (provider, external_id, status);
CREATE INDEX IF NOT EXISTS messaging_sessions_idle_idx ON messaging_sessions (status, last_item_at);

CREATE TABLE IF NOT EXISTS messaging_session_items (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES messaging_sessions(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency guard against duplicate webhook deliveries. Postgres treats NULLs
-- as distinct, so items lacking a provider message id (e.g. synthesized) coexist.
CREATE UNIQUE INDEX IF NOT EXISTS messaging_session_items_provider_msg_idx ON messaging_session_items (provider_message_id);
CREATE INDEX IF NOT EXISTS messaging_session_items_session_idx ON messaging_session_items (session_id, seq);
`;
