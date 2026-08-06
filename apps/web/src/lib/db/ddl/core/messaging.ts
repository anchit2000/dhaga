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

-- The AUDIT record of one batch: when the walk finished, the exact summary the
-- sender was replied with, and a PII-free failure reason. Written by the walk
-- itself rather than reconstructed later, because "what happened to the batch I
-- sent?" cannot be answered from the items alone once the contacts and notes
-- have been edited or deleted. Added by ALTER too — the CREATE above is IF NOT
-- EXISTS and never reaches an existing install.
ALTER TABLE messaging_sessions ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE messaging_sessions ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE messaging_sessions ADD COLUMN IF NOT EXISTS error text;

-- The webhook looks up an open batch for an incoming sender by (provider,
-- external_id, status); the idle-flush job scans open batches by last activity.
CREATE INDEX IF NOT EXISTS messaging_sessions_open_idx ON messaging_sessions (provider, external_id, status);
CREATE INDEX IF NOT EXISTS messaging_sessions_idle_idx ON messaging_sessions (status, last_item_at);

-- Keyset pagination for the capture-log audit (newest first). This core index
-- is the SELF-HOST one: no user_id column exists without packages/ee, so a
-- single-tenant install pages on (created_at, id) alone. The hosted build adds
-- a (user_id, created_at DESC, id DESC) index in ee/src/db/rls-ddl — the same
-- split ai_actions already uses for the credits history page.
CREATE INDEX IF NOT EXISTS messaging_sessions_created_idx ON messaging_sessions (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS messaging_session_items (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES messaging_sessions(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Per-item completion stamp, so a batch is RESUMABLE. A flush runs in a
-- background after() on a function with a hard time ceiling, so a long batch
-- (a day's worth of forwards) can be killed mid-walk. Without this, re-driving
-- it would re-create every contact and note it already wrote; with it, the
-- retry picks up exactly where it stopped. Added by ALTER too, since the CREATE
-- above is IF NOT EXISTS and never reaches an existing install.
ALTER TABLE messaging_session_items ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Per-message AUDIT disposition: what the batch planner decided this specific
-- message became. outcome_kind is the coarse verdict the capture log filters
-- and colours on; outcome carries the specifics (which contact, which note,
-- which confirmation) so a row can link straight to what it produced.
--
-- Recorded here rather than derived, for the same reason as the session summary:
-- once the user edits or deletes the resulting contact there is no way back to
-- "what did message 3 actually do?". An unaccounted verdict in particular MUST be
-- storable — it is how a message the planner silently omitted becomes visible
-- instead of vanishing (CLAUDE.md Rule 12).
ALTER TABLE messaging_session_items ADD COLUMN IF NOT EXISTS outcome_kind text;
ALTER TABLE messaging_session_items ADD COLUMN IF NOT EXISTS outcome jsonb;

-- Idempotency guard against duplicate webhook deliveries. Postgres treats NULLs
-- as distinct, so items lacking a provider message id (e.g. synthesized) coexist.
CREATE UNIQUE INDEX IF NOT EXISTS messaging_session_items_provider_msg_idx ON messaging_session_items (provider_message_id);
CREATE INDEX IF NOT EXISTS messaging_session_items_session_idx ON messaging_session_items (session_id, seq);

CREATE TABLE IF NOT EXISTS messaging_pending_questions (
  id text PRIMARY KEY,
  provider text NOT NULL,
  external_id text NOT NULL,
  subject_name text,
  note_body text NOT NULL,
  options jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Looked up by chat on every inbound message (is this a reply to my question?),
-- newest first. Deliberately NOT unique: the (provider, external_id) pair is
-- already unique per user via messaging_identities, and a unique index on a
-- tenant table would be enforced across tenants by Postgres, above RLS.
CREATE INDEX IF NOT EXISTS messaging_pending_questions_chat_idx ON messaging_pending_questions (provider, external_id, created_at);
`;
