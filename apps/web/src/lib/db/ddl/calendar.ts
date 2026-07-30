/**
 * Calendar-integration DDL, kept separate from core.ts the same way auth/search/
 * vector DDL are (concatenated in ./index.ts). OAuth tokens are stored as
 * AES-256-GCM ciphertext (lib/crypto/tokens.ts), never plaintext. Idempotent,
 * boot-time applied — the project's "boring migrations" convention (CLAUDE.md
 * principle 5).
 *
 * A connection is free/busy-only by default and stays that way; the full tier
 * (real event reads + writing follow-ups out) is opt-in per connection and is
 * derived from the granted `scope` string, so NO column decides capability and
 * no existing connection changes behaviour. The two columns added below are
 * write-out bookkeeping only:
 *   write_calendar_id — the id of the secondary "Dhaga" calendar we created, so
 *                       we never touch the user's primary calendar.
 *   write_enabled     — the user's own on/off switch for write-out, independent
 *                       of the granted scope (they can keep the grant, stop the
 *                       writes). Defaults true so upgrading does what it says.
 */
export const CALENDAR_DDL = `
CREATE TABLE IF NOT EXISTS calendar_connections (
  id text PRIMARY KEY,
  provider text NOT NULL,
  account_email text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  status text NOT NULL DEFAULT 'connected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calendar_connections_provider_idx ON calendar_connections (provider);
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS write_calendar_id text;
ALTER TABLE calendar_connections ADD COLUMN IF NOT EXISTS write_enabled boolean NOT NULL DEFAULT true;

-- Which follow-up we wrote as which event, per connection. Without it a
-- completed or dismissed follow-up could not be deleted from the calendar it
-- was written to (Microsoft Graph will not accept a client-chosen event id), and
-- "must not linger as an event" is the whole point of the write-out.
CREATE TABLE IF NOT EXISTS calendar_event_links (
  id text PRIMARY KEY,
  connection_id text NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  follow_up_id text NOT NULL,
  external_event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_event_links_connection_follow_up_idx
  ON calendar_event_links (connection_id, follow_up_id);
CREATE INDEX IF NOT EXISTS calendar_event_links_follow_up_idx ON calendar_event_links (follow_up_id);
`;
