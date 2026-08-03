import { randomUUID } from "node:crypto";
import { registerCalendarProvider, type BusyInterval, type CalendarProvider } from "@dhaga/core";
import { encryptToken } from "@/lib/crypto/tokens";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections } from "@/lib/db/schema";
import type { FreeBusyScope } from "@/lib/repo/calendar";

/**
 * The two real signals the free/busy scope spec watches: the Postgres client
 * actually issuing a query, and a calendar provider actually being called —
 * each stamped with how deep inside a tenant scope it happened. Nothing here
 * inspects source code, so the spec fails on BEHAVIOUR (an outbound call made
 * while a connection is held), not on a shape it recognises.
 */
export interface Moment {
  what: string;
  scopeDepth: number;
}

interface CountingClient {
  query: (...args: unknown[]) => unknown;
}

export const trace = {
  scopeDepth: 0,
  moments: [] as Moment[],
  /** What the fake provider's refresh() returns; null = refresh impossible. */
  refreshResult: null as { accessToken: string } | null,
  reset(): void {
    trace.moments = [];
    trace.refreshResult = { accessToken: "fresh-token" };
  },
  record(what: string): void {
    trace.moments.push({ what, scopeDepth: trace.scopeDepth });
  },
  at(prefix: string): Moment[] {
    return trace.moments.filter((moment) => moment.what.startsWith(prefix));
  },
};

/** Stands in for withUserDb: everything inside runs with a scope held. */
export const runScoped: FreeBusyScope = async (work) => {
  trace.scopeDepth++;
  try {
    return await work();
  } finally {
    trace.scopeDepth--;
  }
};

export const PROVIDER_ID = `test-free-busy-${randomUUID()}`;

const provider: CalendarProvider = {
  id: PROVIDER_ID,
  label: "Test calendar",
  isConfigured: () => true,
  getAuthUrl: () => "https://example.invalid/auth",
  exchangeCode: async () => {
    throw new Error("not used by the free/busy path");
  },
  // Both of these are outbound HTTP in production.
  refresh: async () => {
    trace.record("provider:refresh");
    const result = trace.refreshResult;
    return (
      result && {
        ...result,
        refreshToken: null,
        expiresAt: null,
        scope: null,
        accountEmail: null,
      }
    );
  },
  listBusy: async (): Promise<BusyInterval[]> => {
    trace.record("provider:listBusy");
    return [{ start: new Date("2026-01-01T09:00:00Z"), end: new Date("2026-01-01T10:00:00Z") }];
  },
};

/** Register the fake provider and start stamping every PGlite query. */
export async function installHarness(): Promise<() => void> {
  process.env.CALENDAR_TOKEN_SECRET ??= "free-busy-scope-test-secret";
  const unregister = registerCalendarProvider(provider);
  await getDb();
  const store = globalThis as unknown as { __dhagaClient?: CountingClient };
  const client = store.__dhagaClient;
  if (!client) throw new Error("expected the embedded PGlite client to be initialised");
  const original = client.query.bind(client);
  client.query = (...args: unknown[]) => {
    trace.record(`db:${String(args[0]).replace(/\s+/g, " ").slice(0, 40)}`);
    return original(...args);
  };
  return () => {
    client.query = original;
    unregister();
  };
}

export async function seedConnection(expiresAt: Date | null): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(calendarConnections).values({
    id,
    provider: PROVIDER_ID,
    accountEmail: "cal@dhaga.internal",
    accessToken: encryptToken("stored-token"),
    refreshToken: encryptToken("stored-refresh"),
    expiresAt,
    scope: null,
    status: "connected",
  });
  return id;
}

export const WEEK = {
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-01-08T00:00:00Z"),
};
