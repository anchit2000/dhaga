import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { contactSyncCapabilities } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contactConnections } from "@/lib/db/schema";
import { encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";
import type { ContactSyncCapabilities, ContactSyncTokens } from "@dhaga/core";

/** Storage for contact-sync OAuth grants. Token columns never leave this layer. */

export interface ContactConnectionSummary {
  id: string;
  provider: string;
  accountEmail: string | null;
  status: string;
  syncEnabled: boolean;
  pushUnlinked: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  /** Derived from the granted scope — never stored, never assumed. */
  capabilities: ContactSyncCapabilities;
}

/** Connections for the settings UI. Deliberately never selects the tokens. */
export async function listContactConnections(): Promise<ContactConnectionSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contactConnections.id,
      provider: contactConnections.provider,
      accountEmail: contactConnections.accountEmail,
      status: contactConnections.status,
      syncEnabled: contactConnections.syncEnabled,
      pushUnlinked: contactConnections.pushUnlinked,
      lastSyncedAt: contactConnections.lastSyncedAt,
      createdAt: contactConnections.createdAt,
      scope: contactConnections.scope,
    })
    .from(contactConnections)
    .orderBy(desc(contactConnections.createdAt));
  return rows.map(({ scope, ...row }) => ({
    ...row,
    capabilities: contactSyncCapabilities(row.provider, scope),
  }));
}

/**
 * Upsert by (provider, account): re-connecting the same account refreshes it in
 * place rather than stacking duplicate grants. `syncEnabled` is deliberately NOT
 * written — re-consenting must not silently re-enable syncing the user turned off.
 */
export async function saveContactConnection(params: {
  provider: string;
  tokens: ContactSyncTokens;
}): Promise<void> {
  const db = await getDb();
  const { provider, tokens } = params;
  const [existing] = await db
    .select({ id: contactConnections.id, scope: contactConnections.scope })
    .from(contactConnections)
    .where(
      and(
        eq(contactConnections.provider, provider),
        tokens.accountEmail
          ? eq(contactConnections.accountEmail, tokens.accountEmail)
          : isNull(contactConnections.accountEmail),
      ),
    )
    .limit(1);

  const values = {
    provider,
    accountEmail: tokens.accountEmail,
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptOptionalToken(tokens.refreshToken),
    expiresAt: tokens.expiresAt,
    // Keep the grant we already know about when the token response omits
    // `scope` (optional on Microsoft's auth-code leg): overwriting with null
    // would downgrade a working connection to no-access on an ordinary
    // reconnect, and the next run would refuse to sync.
    scope: tokens.scope ?? existing?.scope ?? null,
    status: "connected",
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(contactConnections).set(values).where(eq(contactConnections.id, existing.id));
  } else {
    await db.insert(contactConnections).values({ id: randomUUID(), ...values });
  }
}

export async function deleteContactConnection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(contactConnections).where(eq(contactConnections.id, id));
}

/** Turn syncing on/off without touching the grant. */
export async function setContactSyncEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db
    .update(contactConnections)
    .set({ syncEnabled: enabled, updatedAt: new Date() })
    .where(eq(contactConnections.id, id));
}

/** Opt in/out of copying Dhaga-only people into the account. See the DDL. */
export async function setContactPushUnlinked(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db
    .update(contactConnections)
    .set({ pushUnlinked: enabled, updatedAt: new Date() })
    .where(eq(contactConnections.id, id));
}

export async function markNeedsReconnect(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(contactConnections)
    .set({ status: "needs_reconnect", updatedAt: new Date() })
    .where(eq(contactConnections.id, id));
}

export async function recordSyncRun(id: string, at: Date): Promise<void> {
  const db = await getDb();
  await db
    .update(contactConnections)
    .set({ lastSyncedAt: at, updatedAt: new Date() })
    .where(eq(contactConnections.id, id));
}
