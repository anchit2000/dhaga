/**
 * Calendar-integration DDL, kept separate from core.ts the same way auth/search/
 * vector DDL are (concatenated in ./index.ts). Connected calendars are read for
 * FREE/BUSY only, never written to; OAuth tokens are stored as AES-256-GCM
 * ciphertext (lib/crypto/tokens.ts), never plaintext. Idempotent, boot-time
 * applied — the project's "boring migrations" convention (CLAUDE.md principle 5).
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
`;
