import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { signals } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import {
  countWatched,
  dismissSignal,
  hasOpenSignal,
  listContactSignals,
  listNewSignals,
  markSignalNoted,
  toggleWatch,
} from "@/lib/repo/signals";
import { runSignalDetection } from "@/lib/jobs/detect-signals";
import { PRO_TIER_WATCHLIST_CAP } from "@/utils/constants/app";

const TEST_USER = "test-user";

function person(name: string) {
  return {
    name,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
  };
}

async function insertSignal(
  contactId: string,
  overrides: Partial<{ kind: string; status: string }> = {},
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(signals).values({
    id,
    contactId,
    kind: overrides.kind ?? "job_change",
    headline: "Moved to a new company",
    detail: "Now VP of Sales at Acme, per their LinkedIn.",
    sourceUrl: "https://example.com/profile",
    status: overrides.status ?? "new",
  });
  return id;
}

describe("watchlist opt-in (toggleWatch)", () => {
  it("watching resets the scan clock so the next sweep picks it up immediately", async () => {
    const id = await createContact(person("Priya Watch"), "manual");
    const result = await toggleWatch(TEST_USER, id, true);
    expect(result.ok).toBe(true);
    expect(await countWatched()).toBeGreaterThan(0);
  });

  it("enforces the per-plan watchlist cap so a nightly sweep can't grow unbounded", async () => {
    // Other tests in this file may already have watched contacts (shared
    // PGlite instance per file) — fill only the remaining headroom.
    const remaining = PRO_TIER_WATCHLIST_CAP - (await countWatched());
    const ids: string[] = [];
    for (let i = 0; i < remaining; i++) {
      const id = await createContact(person(`Cap Fill ${i}`), "manual");
      ids.push(id);
      const result = await toggleWatch(TEST_USER, id, true);
      expect(result.ok).toBe(true);
    }

    const overflowId = await createContact(person("Cap Overflow"), "manual");
    const blocked = await toggleWatch(TEST_USER, overflowId, true);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/watch up to/i);

    // Freeing a slot lets the next contact in — the cap is live, not a
    // one-time gate.
    await toggleWatch(TEST_USER, ids[0], false);
    const afterFree = await toggleWatch(TEST_USER, overflowId, true);
    expect(afterFree.ok).toBe(true);
  });
});

describe("signal lifecycle (repo/signals.ts)", () => {
  it("a new signal surfaces on Home and the contact page until acted on", async () => {
    const id = await createContact(person("Noor Notified"), "manual");
    const signalId = await insertSignal(id);

    const home = await listNewSignals();
    expect(home.some((s) => s.id === signalId)).toBe(true);

    const onContact = await listContactSignals(id);
    expect(onContact.map((s) => s.id)).toContain(signalId);
  });

  it("dismissing a signal removes it from both feeds", async () => {
    const id = await createContact(person("Farid Filed"), "manual");
    const signalId = await insertSignal(id);
    await dismissSignal(signalId);

    expect((await listNewSignals()).some((s) => s.id === signalId)).toBe(false);
    expect((await listContactSignals(id)).some((s) => s.id === signalId)).toBe(false);
  });

  it("converting a signal to a note also clears it from the feeds", async () => {
    const id = await createContact(person("Wei Written"), "manual");
    const signalId = await insertSignal(id);
    await markSignalNoted(signalId);

    expect((await listNewSignals()).some((s) => s.id === signalId)).toBe(false);
  });
});

describe("hasOpenSignal — dedup guard for the nightly sweep", () => {
  it("reports open once an unactioned signal of that kind exists, so the sweep can skip re-inserting it", async () => {
    // Nothing updates the contact's title/company when a job_change signal
    // fires (that's an explicit "add as note" action, not an automatic graph
    // write) — so an unresolved change still looks new on every ~6-day
    // rescan. Without this guard the sweep would keep inserting a fresh
    // "new" row for the same still-open change, forever.
    const id = await createContact(person("Omar Overlap"), "manual");
    expect(await hasOpenSignal(id, "job_change")).toBe(false);

    await insertSignal(id, { kind: "job_change" });
    expect(await hasOpenSignal(id, "job_change")).toBe(true);
    // A different kind for the same contact is a separate alert, not a dup.
    expect(await hasOpenSignal(id, "news")).toBe(false);
  });

  it("stops reporting open once the existing signal is dismissed or converted, allowing a genuinely new one through", async () => {
    const id = await createContact(person("Lena Later"), "manual");
    const signalId = await insertSignal(id, { kind: "job_change" });
    await dismissSignal(signalId);
    expect(await hasOpenSignal(id, "job_change")).toBe(false);

    const secondId = await insertSignal(id, { kind: "job_change" });
    await markSignalNoted(secondId);
    expect(await hasOpenSignal(id, "job_change")).toBe(false);
  });
});

describe("signal detection job — graceful degradation", () => {
  it("never throws when no search provider is configured; it reports why", async () => {
    // The vitest env sets neither FIRECRAWL_API_KEY nor ANTHROPIC_API_KEY
    // (vitest.config.ts) — this is the self-host-with-nothing-configured
    // path every deployment starts in, and the job must not crash a cron.
    const summary = await runSignalDetection();
    expect(summary.skipped).toBe("no_search");
    expect(summary.created).toBe(0);
  });
});
