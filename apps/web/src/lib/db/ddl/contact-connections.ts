/**
 * Server-side contact-sync connections (Google People, Microsoft Graph).
 *
 * A SEPARATE table from calendar_connections on purpose. Reading someone's
 * calendar and writing their address book are independent decisions, granted as
 * independent OAuth scopes; sharing one row would mean re-consenting to calendar
 * in order to sync contacts, and a reconnect on either feature could narrow the
 * other's grant. The two integrations share the token-encryption helper
 * (lib/crypto/tokens.ts) and nothing else.
 *
 * Tokens are AES-256-GCM ciphertext, never plaintext. Idempotent, boot-time
 * applied — the project's "boring migrations" convention.
 *
 * `sync_enabled` is the user's own switch, independent of the granted scope:
 * they can keep the connection and stop the syncing without revoking anything.
 * Defaults true so connecting does what it says on the button.
 */
export const CONTACT_CONNECTIONS_DDL = `
CREATE TABLE IF NOT EXISTS contact_connections (
  id text PRIMARY KEY,
  provider text NOT NULL,
  account_email text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  status text NOT NULL DEFAULT 'connected',
  sync_enabled boolean NOT NULL DEFAULT true,
  -- Copy people who exist ONLY in Dhaga into the connected account. Default
  -- FALSE and opt-in, matching the mobile "Add Dhaga-only contacts to this
  -- phone" switch: most users do not want every scanned business card landing
  -- in their Google account, and doing it unasked would be a privacy incident
  -- rather than a feature. This is also the switch that closes the Android gap,
  -- where a contact Dhaga created never reaches the account at all.
  push_unlinked boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_connections_provider_idx ON contact_connections (provider);
`;
