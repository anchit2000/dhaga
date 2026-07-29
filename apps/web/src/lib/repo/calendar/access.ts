import { eq } from "drizzle-orm";
import { getCalendarProvider, type CalendarProvider } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections, type CalendarConnectionRow } from "@/lib/db/schema";
import { decryptToken, encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";

/** Refresh a token this many ms before its stated expiry, to avoid edge misses. */
const REFRESH_SKEW_MS = 60_000;

/** Every connection that is currently usable. One query, one connection. */
export async function connectedCalendarRows(): Promise<CalendarConnectionRow[]> {
  const db = await getDb();
  return db.select().from(calendarConnections).where(eq(calendarConnections.status, "connected"));
}

export async function markNeedsReconnect(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(calendarConnections)
    .set({ status: "needs_reconnect", updatedAt: new Date() })
    .where(eq(calendarConnections.id, id));
}

/**
 * A usable access token for `row`, refreshing lazily when it is at/near expiry.
 * Returns null when refresh is impossible (revoked / no refresh token), having
 * flagged the connection `needs_reconnect` — one broken calendar never blocks
 * the others.
 *
 * The connection's STORED scope is handed to refresh(): a provider that must
 * re-send scopes (Microsoft) would otherwise post its default free/busy set and
 * silently narrow an upgraded connection back down.
 */
export async function usableAccessToken(
  provider: CalendarProvider,
  row: CalendarConnectionRow,
): Promise<string | null> {
  const nearExpiry = row.expiresAt !== null && row.expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS;
  if (!nearExpiry || !row.refreshToken) return decryptToken(row.accessToken);
  const refreshed = await provider.refresh(decryptToken(row.refreshToken), row.scope);
  if (!refreshed) {
    await markNeedsReconnect(row.id);
    return null;
  }
  const db = await getDb();
  await db
    .update(calendarConnections)
    .set({
      accessToken: encryptToken(refreshed.accessToken),
      refreshToken: encryptOptionalToken(refreshed.refreshToken),
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope ?? row.scope,
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, row.id));
  return refreshed.accessToken;
}

/** The registered provider for a row, or null when its id is unknown. */
export function providerFor(row: CalendarConnectionRow): CalendarProvider | null {
  try {
    return getCalendarProvider(row.provider);
  } catch {
    return null;
  }
}
