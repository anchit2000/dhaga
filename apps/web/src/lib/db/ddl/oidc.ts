/**
 * Tables for better-auth's `mcp` plugin, which reuses the `oidc-provider`
 * schema to act as the OAuth 2.1 authorization server that external MCP
 * clients (Claude, ChatGPT, Cursor) log in against.
 *
 * Shapes come verbatim from `better-auth/plugins/oidc-provider/schema` —
 * `oauth_access_token` and `oauth_consent` reference `oauth_application` by
 * its **client_id**, not its primary key, which is why that column carries a
 * UNIQUE constraint rather than just an index.
 *
 * These are global auth tables like `user`/`session`/`apikey`, not tenant
 * tables — they are deliberately absent from packages/ee's TENANT_TABLES,
 * because auth runs on the unscoped global connection.
 */
export const OIDC_DDL = `
CREATE TABLE IF NOT EXISTS oauth_application (
  id text PRIMARY KEY,
  name text,
  icon text,
  metadata text,
  client_id text NOT NULL UNIQUE,
  client_secret text,
  redirect_urls text,
  type text,
  disabled boolean DEFAULT false,
  user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauthApplication_userId_idx" ON oauth_application (user_id);

CREATE TABLE IF NOT EXISTS oauth_access_token (
  id text PRIMARY KEY,
  access_token text NOT NULL UNIQUE,
  refresh_token text NOT NULL UNIQUE,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  client_id text NOT NULL REFERENCES oauth_application(client_id) ON DELETE CASCADE,
  user_id text REFERENCES "user"(id) ON DELETE CASCADE,
  scopes text,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauthAccessToken_clientId_idx" ON oauth_access_token (client_id);
CREATE INDEX IF NOT EXISTS "oauthAccessToken_userId_idx" ON oauth_access_token (user_id);

CREATE TABLE IF NOT EXISTS oauth_consent (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES oauth_application(client_id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scopes text,
  consent_given boolean,
  created_at timestamp NOT NULL,
  updated_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauthConsent_clientId_idx" ON oauth_consent (client_id);
CREATE INDEX IF NOT EXISTS "oauthConsent_userId_idx" ON oauth_consent (user_id);
`;
