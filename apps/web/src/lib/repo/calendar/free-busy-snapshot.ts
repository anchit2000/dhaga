import type { BusyInterval, TimeRange } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { getSetting, setSetting } from "@/lib/repo/settings";
import {
  FREE_BUSY_SNAPSHOT_KEY,
  FREE_BUSY_SNAPSHOT_MAX_AGE_MS,
  FREE_BUSY_SNAPSHOT_STALE_MS,
} from "@/utils/constants/calendar";
import { getFreeBusy, type FreeBusyScope } from "./free-busy";

/**
 * The user's last-known free/busy, stored on their own tenant row.
 *
 * WHY IT EXISTS. An RSC render pins ONE tenant connection for the whole request
 * (lib/db/request-scope.ts) and releases it in `after()`, so an outbound Google
 * call made anywhere in that render holds one of the three tenant-pool slots for
 * its full duration — nothing *inside* the render can avoid that, which is
 * exactly the failure PRs #83/#92 were about. So Home stops making the call:
 * it reads this snapshot (one row, on the connection it already holds) and
 * schedules `refreshFreeBusySnapshot` in `after()`, where the provider round-trip
 * happens off the response path with no connection held across it.
 *
 * Stale-while-revalidate, not a cache with a TTL: the render always uses what is
 * stored (up to MAX_AGE) and never waits for a refresh.
 */
export interface FreeBusySnapshot {
  busy: BusyInterval[];
  /** Old enough to be worth refreshing after the response. */
  stale: boolean;
}

interface StoredSnapshot {
  fetchedAt: string;
  busy: [string, string][];
}

function parse(raw: string, now: Date): FreeBusySnapshot | null {
  let stored: StoredSnapshot;
  try {
    stored = JSON.parse(raw) as StoredSnapshot;
  } catch {
    return null;
  }
  const fetchedAt = Date.parse(stored?.fetchedAt ?? "");
  if (Number.isNaN(fetchedAt) || !Array.isArray(stored.busy)) return null;
  const age = now.getTime() - fetchedAt;
  // A snapshot from the future (clock skew) is as untrustworthy as an expired
  // one, and treating it as fresh would pin the calendar tiles to it forever.
  if (age < 0 || age > FREE_BUSY_SNAPSHOT_MAX_AGE_MS) return null;

  const busy: BusyInterval[] = [];
  for (const entry of stored.busy) {
    const start = Date.parse(entry?.[0] ?? "");
    const end = Date.parse(entry?.[1] ?? "");
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    busy.push({ start: new Date(start), end: new Date(end) });
  }
  return { busy, stale: age > FREE_BUSY_SNAPSHOT_STALE_MS };
}

/**
 * The stored snapshot, or null when there is none, it is unreadable, or it is
 * too old to be safe to derive free time from. Null means "unknown", which the
 * caller must render differently from "no busy blocks" — see load.ts.
 */
export async function readFreeBusySnapshot(now: Date): Promise<FreeBusySnapshot | null> {
  const raw = await getSetting(FREE_BUSY_SNAPSHOT_KEY);
  return raw === null ? null : parse(raw, now);
}

/**
 * Re-read free/busy from the connected calendars and store it. Runs OFF the
 * response path (`after()`), and gives `getFreeBusy` a per-phase scope so the
 * only connections it takes are the short ones around its DB reads/writes —
 * never one spanning the provider call.
 */
export async function refreshFreeBusySnapshot(userId: string, range: TimeRange): Promise<void> {
  const runScoped: FreeBusyScope = (work) => withUserDb(userId, work);
  const busy = await getFreeBusy(range, runScoped);
  const value = JSON.stringify({
    fetchedAt: new Date().toISOString(),
    busy: busy.map((interval) => [interval.start.toISOString(), interval.end.toISOString()]),
  } satisfies StoredSnapshot);
  await withUserDb(userId, () => setSetting(FREE_BUSY_SNAPSHOT_KEY, value));
}
