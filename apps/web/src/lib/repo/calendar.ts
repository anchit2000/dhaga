import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  getCalendarProvider,
  mergeBusy,
  type BusyInterval,
  type CalendarTokens,
  type TimeRange,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections } from "@/lib/db/schema";
import {
  decryptToken,
  encryptOptionalToken,
  encryptToken,
} from "@/lib/crypto/tokens";

/** Refresh a token this many ms before its stated expiry, to avoid edge misses. */
const REFRESH_SKEW_MS = 60_000;

export interface CalendarConnectionSummary {
  id: string;
  provider: string;
  accountEmail: string | null;
  status: string;
  createdAt: Date;
}

/** Connections for the settings UI — never exposes tokens. */
export async function listCalendarConnections(): Promise<CalendarConnectionSummary[]> {
  const db = await getDb();
  return db
    .select({
      id: calendarConnections.id,
      provider: calendarConnections.provider,
      accountEmail: calendarConnections.accountEmail,
      status: calendarConnections.status,
      createdAt: calendarConnections.createdAt,
    })
    .from(calendarConnections)
    .orderBy(desc(calendarConnections.createdAt));
}

export async function hasCalendarConnection(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ id: calendarConnections.id }).from(calendarConnections).limit(1);
  return Boolean(row);
}

/** Upsert by (provider, account): re-connecting the same account refreshes it in place. */
export async function saveCalendarConnection(params: {
  provider: string;
  tokens: CalendarTokens;
}): Promise<void> {
  const db = await getDb();
  const { provider, tokens } = params;
  const [existing] = await db
    .select({ id: calendarConnections.id })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.provider, provider),
        tokens.accountEmail
          ? eq(calendarConnections.accountEmail, tokens.accountEmail)
          : isNull(calendarConnections.accountEmail),
      ),
    )
    .limit(1);
  const values = {
    provider,
    accountEmail: tokens.accountEmail,
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: encryptOptionalToken(tokens.refreshToken),
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
    status: "connected",
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(calendarConnections).set(values).where(eq(calendarConnections.id, existing.id));
  } else {
    await db.insert(calendarConnections).values({ id: randomUUID(), ...values });
  }
}

export async function deleteCalendarConnection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(calendarConnections).where(eq(calendarConnections.id, id));
}

async function markNeedsReconnect(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(calendarConnections)
    .set({ status: "needs_reconnect", updatedAt: new Date() })
    .where(eq(calendarConnections.id, id));
}

/**
 * Merged busy intervals across every connected calendar for `range`. Refreshes
 * near-expiry access tokens in place; a provider that errors (revoked access,
 * unknown provider id) is flagged `needs_reconnect` and skipped rather than
 * failing the whole read — one broken calendar never blocks the others.
 */
export async function getFreeBusy(range: TimeRange): Promise<BusyInterval[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.status, "connected"));
  const all: BusyInterval[] = [];
  for (const row of rows) {
    try {
      const provider = getCalendarProvider(row.provider);
      let accessToken = decryptToken(row.accessToken);
      const nearExpiry =
        row.expiresAt !== null && row.expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS;
      if (nearExpiry && row.refreshToken) {
        const refreshed = await provider.refresh(decryptToken(row.refreshToken));
        if (!refreshed) {
          await markNeedsReconnect(row.id);
          continue;
        }
        accessToken = refreshed.accessToken;
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
      }
      all.push(...(await provider.listBusy({ accessToken, range })));
    } catch {
      await markNeedsReconnect(row.id);
    }
  }
  return mergeBusy(all);
}
