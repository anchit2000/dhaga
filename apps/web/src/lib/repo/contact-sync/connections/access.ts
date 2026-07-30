import { and, eq } from "drizzle-orm";
import { getContactSyncProvider } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contactConnections } from "@/lib/db/schema";
import { decryptToken, encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";
import { markNeedsReconnect } from "./crud";
import type { ContactSyncProvider } from "@dhaga/core";
import type { ContactConnectionRow } from "@/lib/db/schema";

/** Token resolution — the only place a stored token is decrypted. */

/** Refresh a token this many ms before its stated expiry, to avoid edge misses. */
const REFRESH_SKEW_MS = 60_000;

/** The registered provider for a row, or null when its id is unknown. */
export function providerFor(row: { provider: string }): ContactSyncProvider | null {
  try {
    return getContactSyncProvider(row.provider);
  } catch {
    return null;
  }
}

/** Every connection currently eligible for a sync run. */
export async function syncableConnectionRows(): Promise<ContactConnectionRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(contactConnections)
    .where(
      and(eq(contactConnections.status, "connected"), eq(contactConnections.syncEnabled, true)),
    );
}

/**
 * A usable access token for `row`, refreshing lazily at/near expiry. Returns
 * null when refresh is impossible (revoked, or no refresh token), having flagged
 * the connection `needs_reconnect` — one dead grant must not fail the run for
 * the user's other connections.
 *
 * The connection's STORED scope is handed to refresh() because Microsoft
 * re-sends scopes on the refresh leg and would otherwise post its defaults,
 * narrowing the grant behind the user's back.
 */
export async function usableAccessToken(
  provider: ContactSyncProvider,
  row: ContactConnectionRow,
): Promise<string | null> {
  const nearExpiry =
    row.expiresAt !== null && row.expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS;
  if (!nearExpiry || !row.refreshToken) return decryptToken(row.accessToken);

  const refreshed = await provider.refresh(decryptToken(row.refreshToken), row.scope);
  if (!refreshed) {
    await markNeedsReconnect(row.id);
    return null;
  }
  const db = await getDb();
  await db
    .update(contactConnections)
    .set({
      accessToken: encryptToken(refreshed.accessToken),
      refreshToken: encryptOptionalToken(refreshed.refreshToken),
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope ?? row.scope,
      updatedAt: new Date(),
    })
    .where(eq(contactConnections.id, row.id));
  return refreshed.accessToken;
}
