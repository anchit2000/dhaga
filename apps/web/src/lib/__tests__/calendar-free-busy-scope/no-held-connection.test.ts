import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { encryptToken } from "@/lib/crypto/tokens";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections } from "@/lib/db/schema";
import { getFreeBusy } from "@/lib/repo/calendar";
import { installHarness, runScoped, seedConnection, trace, WEEK } from "./harness";

/**
 * Rule 9 tripwire: NO OUTBOUND PROVIDER CALL MAY HAPPEN INSIDE A HELD TENANT
 * SCOPE.
 *
 * Why it matters, not just what it measures. The tenant pool holds three
 * connections per instance (packages/ee). A connection kept open across an
 * outbound Google/Microsoft round-trip is one of those three parked for as long
 * as a third party takes to answer — the exact failure behind PR #92 (a
 * connection held across an LLM stream) and PR #83 (every /app request queueing
 * behind connection acquisition). A calendar provider is the same class of
 * hazard, and worse: it can hang on an endpoint with no timeout of ours.
 *
 * Interleaving the row reads/writes back into the provider loop — how this code
 * was written before — trips these immediately.
 */

let uninstall: () => void;

beforeAll(async () => {
  uninstall = await installHarness();
});

afterAll(() => uninstall());

beforeEach(async () => {
  const db = await getDb();
  await db.delete(calendarConnections);
  trace.reset();
});

describe("getFreeBusy never holds a tenant connection across a provider call", () => {
  it("talks to the provider with no scope open, and every query inside one", async () => {
    await seedConnection(null);
    trace.reset();

    const busy = await getFreeBusy(WEEK, runScoped);
    expect(busy).toHaveLength(1);

    const outbound = trace.at("provider:");
    expect(outbound.length).toBeGreaterThan(0);
    expect(
      outbound.filter((moment) => moment.scopeDepth > 0),
      "a calendar provider was called while a tenant connection was held — that parks one of three pool slots for the provider's full latency",
    ).toEqual([]);

    const queries = trace.at("db:");
    expect(queries.length).toBeGreaterThan(0);
    expect(
      queries.filter((moment) => moment.scopeDepth === 0),
      "a query ran outside the scope — the connection rows must be read inside one",
    ).toEqual([]);
  });

  it("holds nothing across the token refresh either, and still persists it", async () => {
    const id = await seedConnection(new Date(Date.now() - 60_000));
    trace.reset();

    await getFreeBusy(WEEK, runScoped);

    // The refresh is the subtlest case: it is an HTTP call that PRODUCES a write,
    // so the naive shape ("refresh, then update the row") is exactly what pins a
    // connection across it. The write must still land — deferring it must not
    // mean dropping it, or every render would re-refresh the same token.
    expect(trace.moments.some((moment) => moment.what === "provider:refresh")).toBe(true);
    expect(trace.at("provider:").filter((moment) => moment.scopeDepth > 0)).toEqual([]);
    const db = await getDb();
    const [row] = await db.select().from(calendarConnections);
    expect(row.id).toBe(id);
    expect(row.accessToken).not.toBe(encryptToken("stored-token")); // rewritten, not stale
    expect(row.status).toBe("connected");
  });

  it("flags a connection whose refresh failed, from inside a scope", async () => {
    await seedConnection(new Date(Date.now() - 60_000));
    trace.reset();
    trace.refreshResult = null;

    await getFreeBusy(WEEK, runScoped);

    expect(trace.at("db:").filter((moment) => moment.scopeDepth === 0)).toEqual([]);
    const db = await getDb();
    const [row] = await db.select().from(calendarConnections);
    expect(row.status).toBe("needs_reconnect");
  });
});
