import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { connectionCapabilities, getCalendarProvider, type CalendarCapabilities, type CalendarTokens } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections } from "@/lib/db/schema";
import { encryptOptionalToken, encryptToken } from "@/lib/crypto/tokens";

export interface CalendarConnectionSummary {
  id: string;
  provider: string;
  accountEmail: string | null;
  status: string;
  createdAt: Date;
  /** Derived from the granted scope — never stored, never assumed. */
  capabilities: CalendarCapabilities;
  /** The user's own write-out switch (only meaningful when capabilities.writeEvents). */
  writeEnabled: boolean;
}

/** An unknown/unregistered provider id can't be asked for anything. */
function capabilitiesOf(provider: string, scope: string | null): CalendarCapabilities {
  try {
    return connectionCapabilities(getCalendarProvider(provider), scope);
  } catch {
    return { readEvents: false, writeEvents: false };
  }
}

/** Connections for the settings UI — never exposes tokens. */
export async function listCalendarConnections(): Promise<CalendarConnectionSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: calendarConnections.id,
      provider: calendarConnections.provider,
      accountEmail: calendarConnections.accountEmail,
      status: calendarConnections.status,
      createdAt: calendarConnections.createdAt,
      scope: calendarConnections.scope,
      writeEnabled: calendarConnections.writeEnabled,
    })
    .from(calendarConnections)
    .orderBy(desc(calendarConnections.createdAt));
  return rows.map(({ scope, ...row }) => ({
    ...row,
    capabilities: capabilitiesOf(row.provider, scope),
  }));
}

export async function hasCalendarConnection(): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select({ id: calendarConnections.id }).from(calendarConnections).limit(1);
  return Boolean(row);
}

/**
 * Upsert by (provider, account): re-connecting the same account refreshes it in
 * place. The upgrade flow lands here too — it is the same account consenting
 * again with broader scopes, so only the token/scope columns move.
 * `writeCalendarId`/`writeEnabled` are deliberately NOT written: re-consenting
 * must not orphan the Dhaga calendar we already created, nor silently re-enable
 * write-out the user turned off.
 */
export async function saveCalendarConnection(params: {
  provider: string;
  tokens: CalendarTokens;
}): Promise<void> {
  const db = await getDb();
  const { provider, tokens } = params;
  const [existing] = await db
    .select({ id: calendarConnections.id, scope: calendarConnections.scope })
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
    // Keep the grant we already know about when a provider's token response
    // omits `scope` (it is optional on Microsoft's auth-code leg): overwriting
    // it with null would silently DOWNGRADE an upgraded connection back to
    // free/busy on an ordinary reconnect.
    scope: tokens.scope ?? existing?.scope ?? null,
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

/** Turn write-out on/off without touching the grant — the user keeps the
 *  connection and the scopes, we simply stop writing. */
export async function setCalendarWriteEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db
    .update(calendarConnections)
    .set({ writeEnabled: enabled, updatedAt: new Date() })
    .where(eq(calendarConnections.id, id));
}
