import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections, settings } from "@/lib/db/schema";
import { runDailyDigest } from "@/lib/jobs/daily-digest";
import { setSetting } from "@/lib/repo/settings";
import { installHarness, seedConnection, trace } from "./harness";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

/**
 * Rule 9 tripwire, aimed one level up from ./no-held-connection.test.ts.
 *
 * That spec proves `getFreeBusy` is CAPABLE of running with no tenant connection
 * held across the provider call — it calls it with the correct arguments itself.
 * This one proves the daily-digest sweep, a real caller, actually does, because
 * capability is not what pages a team at 3am. The digest used to call it as
 * `runScoped(() => getFreeBusy(range))`: the caller wrapped all three phases in
 * one scope, so the correct-by-construction split inside `getFreeBusy` was
 * cancelled out from the outside and every hosted tenant's Google round-trip
 * again happened inside an open tenant transaction. The gap between "the unit can
 * do the right thing" and "the caller does" is exactly where that regression
 * lived, undetected, for a release.
 *
 * WHY IT MATTERS. The tenant pool holds three connections per instance
 * (packages/ee/src/db/pool.ts), acquire timeout 10s. A connection parked for the
 * full latency of an unbounded third-party HTTP call is the failure that took
 * /app down in PR #92 (a connection held across an LLM stream) and PR #83 (every
 * request queueing on acquisition). This sweep walks EVERY tenant in one cron
 * invocation, so a single Google endpoint hanging holds a pool slot while live
 * user requests queue behind it.
 *
 * Nothing here reads source code: the trace stamps real PGlite queries and real
 * provider calls with the scope depth they happened at, so the assertion is about
 * behaviour. Only the things a unit test genuinely cannot run are faked — tenant
 * enumeration (needs EE), the outbound email, and the suggestion engine (needs a
 * seeded graph, and it is not on the path under test). The scope runner itself is
 * the REAL `withUserDb`, merely depth-stamped.
 */

/** Outbound email is the sweep's other network call — traced under the same
 *  `provider:` prefix so the "nothing outbound inside a scope" rule covers it. */
const mockSendEmail = vi.fn(async () => {
  trace.record("provider:sendEmail");
  return { ok: true };
});
vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => true,
  ownerEmail: () => "digest-owner@example.com",
  sendEmail: () => mockSendEmail(),
  emailShell: (_title: string, body: string) => body,
}));

const TENANT_ID = "digest-scope-tenant";

vi.mock("@/lib/hosted/tenants", () => ({
  // Real enumeration needs the EE tenant gate; the sweep SHAPE (a sequential
  // per-tenant loop) is what this spec exercises, so one tenant is enough.
  hostedTenants: async () => [{ id: TENANT_ID, email: "digest@example.com" }],
  runOnGlobal: <T>(work: () => Promise<T>) => work(),
}));

vi.mock("@/lib/db/request-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/request-scope")>();
  return {
    ...actual,
    // The REAL withUserDb (in a core-only test env it resolves to the global
    // connection), wrapped only to record that a tenant scope is open. In hosted
    // mode this exact call checks a connection out of the 3-slot pool and opens a
    // transaction on it, which is what `scopeDepth > 0` stands for.
    withUserDb: async <T>(userId: string, work: () => Promise<T>): Promise<T> => {
      trace.scopeDepth++;
      try {
        return await actual.withUserDb(userId, work);
      } finally {
        trace.scopeDepth--;
      }
    },
  };
});

/** Off the path under test and needs a seeded graph; it must only return enough
 *  for the sweep to reach the send phase. */
vi.mock("@/lib/repo/daily-suggestions", () => ({
  buildDailySuggestions: async () => ({
    suggestions: [
      {
        contactId: "c1",
        name: "Ada Lovelace",
        title: null,
        companyName: null,
        bucket: "cadence",
        reason: "Monthly · due to reconnect",
        everyDays: 30,
        lastTouch: null,
      } satisfies DailySuggestion,
    ],
    count: 1,
  }),
}));

let uninstall: () => void;

beforeAll(async () => {
  uninstall = await installHarness();
});

afterAll(() => uninstall());

beforeEach(async () => {
  const db = await getDb();
  await db.delete(calendarConnections);
  await db.delete(settings); // clears the opt-in AND the one-send-per-local-day record
  await setSetting("daily_digest_enabled", "on");
  await setSetting("schedule_prefs", JSON.stringify({ timezone: "UTC" }));
  trace.reset();
});

describe("the daily-digest sweep never holds a tenant connection across a network call", () => {
  it("calls the calendar provider with no tenant scope open, and every query inside one", async () => {
    await seedConnection(null);
    trace.reset();

    await expect(runDailyDigest(new Date("2026-01-01T06:00:00Z"))).resolves.toEqual({
      sent: 1,
      skipped: null,
    });

    const outbound = trace.at("provider:");
    // Guards the assertion below against passing vacuously: a sweep that never
    // reached the calendar (or the email) would trivially hold nothing.
    expect(outbound.map((moment) => moment.what)).toContain("provider:listBusy");
    expect(outbound.map((moment) => moment.what)).toContain("provider:sendEmail");
    expect(
      outbound.filter((moment) => moment.scopeDepth > 0),
      "the digest made an outbound call while holding a tenant connection — in hosted mode that parks one of three pool slots for a third party's full latency, for every tenant in the sweep (the PR #92 failure)",
    ).toEqual([]);

    const queries = trace.at("db:");
    expect(queries.length).toBeGreaterThan(0);
    expect(
      queries.filter((moment) => moment.scopeDepth === 0),
      "a digest query ran outside a tenant scope — under RLS it would read as nobody, which is the bug daily-digest.test.ts covers",
    ).toEqual([]);
  });

  it("holds nothing across the token refresh either — the case that produces a write", async () => {
    // The subtle shape: an HTTP call whose RESULT must be written back, so the
    // obvious implementation ("refresh, then update the row") pins a connection
    // across the refresh. The write must still land, or every run re-refreshes.
    await seedConnection(new Date(Date.now() - 60_000));
    trace.reset();

    await runDailyDigest(new Date("2026-01-01T06:00:00Z"));

    expect(trace.moments.some((moment) => moment.what === "provider:refresh")).toBe(true);
    expect(
      trace.at("provider:").filter((moment) => moment.scopeDepth > 0),
      "a token refresh ran inside a held tenant connection",
    ).toEqual([]);
    const db = await getDb();
    const [row] = await db.select().from(calendarConnections);
    expect(row.status).toBe("connected"); // the deferred write still landed
  });
});
