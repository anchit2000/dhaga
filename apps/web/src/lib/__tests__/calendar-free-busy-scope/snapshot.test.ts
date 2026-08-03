import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections } from "@/lib/db/schema";
import { readFreeBusySnapshot, refreshFreeBusySnapshot } from "@/lib/repo/calendar";
import { setSetting } from "@/lib/repo/settings";
import {
  FREE_BUSY_SNAPSHOT_KEY,
  FREE_BUSY_SNAPSHOT_MAX_AGE_MS,
  FREE_BUSY_SNAPSHOT_STALE_MS,
} from "@/utils/constants/calendar";
import { installHarness, seedConnection, trace, WEEK } from "./harness";

/**
 * The snapshot is what lets Home render calendar-derived UI without calling a
 * calendar provider from inside its request (see ./no-held-connection.test.ts
 * for why that matters). These specs pin the part that is easy to get subtly
 * wrong: what "no usable snapshot" means.
 *
 * It must NOT mean "nothing is booked". Every other failure here is cosmetic;
 * that one hands the user free time they do not have — Dhaga would propose a
 * meeting slot on top of an existing meeting. So an expired snapshot reads as
 * null (unknown) and the caller renders no slots at all, rather than as an empty
 * busy list that findOpenSlots would happily turn into a free working day.
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

async function storeAged(ageMs: number): Promise<void> {
  await setSetting(
    FREE_BUSY_SNAPSHOT_KEY,
    JSON.stringify({
      fetchedAt: new Date(Date.now() - ageMs).toISOString(),
      busy: [["2026-01-01T09:00:00.000Z", "2026-01-01T10:00:00.000Z"]],
    }),
  );
}

describe("the free/busy snapshot", () => {
  it("round-trips what the provider returned", async () => {
    await seedConnection(null);
    await refreshFreeBusySnapshot("snapshot-user", WEEK);

    const snapshot = await readFreeBusySnapshot(new Date());
    expect(snapshot?.busy).toEqual([
      { start: new Date("2026-01-01T09:00:00Z"), end: new Date("2026-01-01T10:00:00Z") },
    ]);
    expect(snapshot?.stale).toBe(false);
  });

  it("is served but marked stale once it is worth refreshing", async () => {
    await storeAged(FREE_BUSY_SNAPSHOT_STALE_MS + 60_000);
    const snapshot = await readFreeBusySnapshot(new Date());
    expect(snapshot?.busy).toHaveLength(1);
    expect(snapshot?.stale).toBe(true);
  });

  it("reads as UNKNOWN once expired — never as an empty calendar", async () => {
    await storeAged(FREE_BUSY_SNAPSHOT_MAX_AGE_MS + 60_000);
    expect(
      await readFreeBusySnapshot(new Date()),
      "an expired snapshot came back as a usable (empty) busy list — Home would offer the whole working day as free",
    ).toBeNull();
  });

  it("reads as unknown when the stored value is unparseable", async () => {
    await setSetting(FREE_BUSY_SNAPSHOT_KEY, "not json");
    expect(await readFreeBusySnapshot(new Date())).toBeNull();
    await setSetting(FREE_BUSY_SNAPSHOT_KEY, JSON.stringify({ fetchedAt: "x", busy: [] }));
    expect(await readFreeBusySnapshot(new Date())).toBeNull();
  });
});
