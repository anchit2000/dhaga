import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * better-auth's `oidc-provider` tables, which the `mcp` plugin reuses to run
 * the OAuth 2.1 authorization server that external MCP clients log in
 * against. Shapes come verbatim from `npx @better-auth/cli generate`.
 *
 * `clientId` is the join key the plugin uses across all three tables (not the
 * primary key), so it is unique on `oauthApplication` and referenced as such.
 */
export const oauthApplication = pgTable(
  "oauth_application",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    icon: text("icon"),
    metadata: text("metadata"),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"),
    redirectUrls: text("redirect_urls"),
    type: text("type"),
    disabled: boolean("disabled").default(false),
    userId: text("user_id"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("oauthApplication_userId_idx").on(table.userId)],
);

export const oauthAccessToken = pgTable(
  "oauth_access_token",
  {
    id: text("id").primaryKey(),
    accessToken: text("access_token").notNull().unique(),
    refreshToken: text("refresh_token").notNull().unique(),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    clientId: text("client_id").notNull(),
    userId: text("user_id"),
    scopes: text("scopes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("oauthAccessToken_clientId_idx").on(table.clientId),
    index("oauthAccessToken_userId_idx").on(table.userId),
  ],
);

export const oauthConsent = pgTable(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").notNull(),
    userId: text("user_id").notNull(),
    scopes: text("scopes"),
    consentGiven: boolean("consent_given"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("oauthConsent_clientId_idx").on(table.clientId),
    index("oauthConsent_userId_idx").on(table.userId),
  ],
);

export type OAuthApplicationRow = typeof oauthApplication.$inferSelect;
export type OAuthAccessTokenRow = typeof oauthAccessToken.$inferSelect;
export type OAuthConsentRow = typeof oauthConsent.$inferSelect;
