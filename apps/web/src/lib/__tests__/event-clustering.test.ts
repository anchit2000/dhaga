import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createContact } from "@/lib/repo/contacts";
import { getEvent, listEventContacts } from "@/lib/repo/events";
import {
  attachScanToEvent,
  matchEventForScan,
  type EventClusterCandidate,
} from "@/lib/repo/event-clustering";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function candidate(id: string, lastScanAt: Date): EventClusterCandidate {
  return { id, lastScanAt };
}

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

/**
 * BRD §6.2: "scans within a rolling window (same geohash-6, gaps <4h)
 * cluster into a Event." matchEventForScan is the pure decision at the
 * heart of that — these cases pin down the boundary a regression would
 * silently break (off-by-one on the 4h window, wrong pick among several
 * same-geohash events).
 */
describe("matchEventForScan", () => {
  it("attaches to a event whose last scan was well within the 4h window", () => {
    const now = new Date("2026-07-07T14:00:00Z");
    const lastScan = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    expect(matchEventForScan(now, [candidate("s1", lastScan)])).toBe("s1");
  });

  it("does not attach when the gap is exactly 4h (boundary is exclusive)", () => {
    const now = new Date("2026-07-07T14:00:00Z");
    const lastScan = new Date(now.getTime() - FOUR_HOURS_MS);
    expect(matchEventForScan(now, [candidate("s1", lastScan)])).toBeNull();
  });

  it("attaches when the gap is 1ms under the 4h window", () => {
    const now = new Date("2026-07-07T14:00:00Z");
    const lastScan = new Date(now.getTime() - FOUR_HOURS_MS + 1);
    expect(matchEventForScan(now, [candidate("s1", lastScan)])).toBe("s1");
  });

  it("returns null when there are no candidates (new geohash, needs a new event)", () => {
    expect(matchEventForScan(new Date(), [])).toBeNull();
  });

  it("picks the most recently active event when several share the geohash", () => {
    const now = new Date("2026-07-07T14:00:00Z");
    const older = candidate("old-visit", new Date(now.getTime() - 3 * 60 * 60 * 1000));
    const newer = candidate("recent-visit", new Date(now.getTime() - 10 * 60 * 1000));
    expect(matchEventForScan(now, [older, newer])).toBe("recent-visit");
  });

  it("skips a same-geohash event from a much older visit outside the window", () => {
    // e.g. the same coffee shop, visited last month — should not silently
    // reuse that old event just because the geohash-6 matches.
    const now = new Date("2026-07-07T14:00:00Z");
    const monthAgo = candidate("last-month", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    expect(matchEventForScan(now, [monthAgo])).toBeNull();
  });
});

describe("attachScanToEvent (DB-backed)", () => {
  it("a second scan at the same geohash within 4h joins the first scan's event", async () => {
    const geohash = randomUUID().slice(0, 6);
    const first = await createContact(person("First Scan"), "quick_add");
    const t0 = new Date("2026-07-07T09:00:00Z");
    const result1 = await attachScanToEvent(first, geohash, t0);
    expect(result1.isNew).toBe(true);

    const second = await createContact(person("Second Scan"), "quick_add");
    const t1 = new Date(t0.getTime() + 60 * 60 * 1000); // 1h later
    const result2 = await attachScanToEvent(second, geohash, t1);
    expect(result2.isNew).toBe(false);
    expect(result2.eventId).toBe(result1.eventId);

    const members = await listEventContacts(result1.eventId);
    expect(members.map((m) => m.id).sort()).toEqual([first, second].sort());
  });

  it("a scan more than 4h later at the same geohash starts a new event", async () => {
    const geohash = randomUUID().slice(0, 6);
    const first = await createContact(person("Morning Scan"), "quick_add");
    const t0 = new Date("2026-07-08T09:00:00Z");
    const result1 = await attachScanToEvent(first, geohash, t0);

    const second = await createContact(person("Evening Scan"), "quick_add");
    const t1 = new Date(t0.getTime() + 5 * 60 * 60 * 1000); // 5h later
    const result2 = await attachScanToEvent(second, geohash, t1);

    expect(result2.isNew).toBe(true);
    expect(result2.eventId).not.toBe(result1.eventId);
  });

  it("a scan at a different geohash never joins another location's event", async () => {
    const geohashA = randomUUID().slice(0, 6);
    const geohashB = randomUUID().slice(0, 6);
    const first = await createContact(person("Venue A"), "quick_add");
    const t0 = new Date("2026-07-09T09:00:00Z");
    const result1 = await attachScanToEvent(first, geohashA, t0);

    const second = await createContact(person("Venue B"), "quick_add");
    const result2 = await attachScanToEvent(second, geohashB, t0);

    expect(result2.isNew).toBe(true);
    expect(result2.eventId).not.toBe(result1.eventId);
  });

  it("the newly-created event is a placeholder with the scan's geohash, ready to be named", async () => {
    const geohash = randomUUID().slice(0, 6);
    const contactId = await createContact(person("Namer"), "quick_add");
    const result = await attachScanToEvent(contactId, geohash, new Date());

    const event = await getEvent(result.eventId);
    expect(event?.geohash).toBe(geohash);
    expect(event?.name).toBeTruthy();
  });
});
