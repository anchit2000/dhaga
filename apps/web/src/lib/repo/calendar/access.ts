import { eq } from "drizzle-orm";
import { getCalendarProvider, type CalendarProvider, type CalendarTokens } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections, type CalendarConnectionRow } from "@/lib/db/schema";
import { decryptToken, encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";

/** Refresh a token this many ms before its stated expiry, to avoid edge misses. */
const REFRESH_SKEW_MS = 60_000;

/**
 * A connection-row write that a provider round-trip produced. It exists so a
 * caller can DEFER it: writing it the moment it happens forces the whole
 * provider loop to run inside one DB scope, which is a tenant connection held
 * across outbound HTTP (see ./free-busy.ts, and docs/SCALING.md lever 2).
 * Collected during the network phase, flushed in one scope afterwards.
 */
export type CalendarWrite =
  | { kind: "needs_reconnect"; id: string }
  | { kind: "refreshed_token"; id: string; row: CalendarConnectionRow; tokens: CalendarTokens };

/** Every connection that is currently usable. One query, one connection. */
export async function connectedCalendarRows(): Promise<CalendarConnectionRow[]> {
  const db = await getDb();
  return db.select().from(calendarConnections).where(eq(calendarConnections.status, "connected"));
}

export async function markNeedsReconnect(id: string): Promise<void> {
  await applyCalendarWrites([{ kind: "needs_reconnect", id }]);
}

/** Apply the writes a provider round-trip produced, in ONE scope. */
export async function applyCalendarWrites(writes: readonly CalendarWrite[]): Promise<void> {
  const db = await getDb();
  for (const write of writes) {
    if (write.kind === "needs_reconnect") {
      await db
        .update(calendarConnections)
        .set({ status: "needs_reconnect", updatedAt: new Date() })
        .where(eq(calendarConnections.id, write.id));
      continue;
    }
    await db
      .update(calendarConnections)
      .set({
        accessToken: encryptToken(write.tokens.accessToken),
        refreshToken: encryptOptionalToken(write.tokens.refreshToken),
        expiresAt: write.tokens.expiresAt,
        scope: write.tokens.scope ?? write.row.scope,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, write.id));
  }
}

/** Defer the write when the caller is collecting them, else apply it now. */
async function record(write: CalendarWrite, pending?: CalendarWrite[]): Promise<void> {
  if (pending) pending.push(write);
  else await applyCalendarWrites([write]);
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
 *
 * Pass `pending` to collect the resulting row writes instead of issuing them —
 * that is what lets a caller keep every DB statement out of the window in which
 * it is talking to the provider.
 */
export async function usableAccessToken(
  provider: CalendarProvider,
  row: CalendarConnectionRow,
  pending?: CalendarWrite[],
): Promise<string | null> {
  const nearExpiry = row.expiresAt !== null && row.expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS;
  if (!nearExpiry || !row.refreshToken) return decryptToken(row.accessToken);
  const refreshed = await provider.refresh(decryptToken(row.refreshToken), row.scope);
  if (!refreshed) {
    await record({ kind: "needs_reconnect", id: row.id }, pending);
    return null;
  }
  await record({ kind: "refreshed_token", id: row.id, row, tokens: refreshed }, pending);
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
