import { dayLoad, spreadAcrossWeek, type BusyInterval } from "@dhaga/core";
import { CADENCE_OPTIONS } from "@/utils/constants/app";
import { getDailySuggestionCount, getSchedulePrefs, type SchedulePrefs } from "./suggestion-settings";
import { listDueReachOuts, type DueReachOut } from "./reminders";
import { listGraphFallbackCandidates } from "./graph-fallback";

/**
 * The unified "reach out to these N people today" engine. Composes primitives
 * that already ship: daily check-ins and periodic (weekly/monthly/…) cadence
 * (reminders.ts) plus a graph-traversal fallback (graph-fallback.ts). Priority:
 * daily check-ins first, then the week's periodic-due people SPREAD across the
 * next 7 days so no single day is overloaded (fewer on calendar-busy days),
 * then any leftover slot filled purely by graph degree. Fully deterministic
 * given its inputs — no AI (CLAUDE.md Rule 5), so zero metered cost.
 */

const DAY_MS = 86_400_000;

export type SuggestionBucket = "daily" | "cadence" | "graph";

export interface DailySuggestion {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  bucket: SuggestionBucket;
  reason: string;
  everyDays: number | null;
  lastTouch: Date | null;
}

export interface DailySuggestionResult {
  suggestions: DailySuggestion[];
  count: number;
}

function cadenceLabel(everyDays: number): string {
  return CADENCE_OPTIONS.find((option) => option.days === everyDays)?.label ?? `Every ${everyDays}d`;
}

/** Absolute instant of the local midnight at or before `nowMs`. */
function localMidnight(nowMs: number, offsetMs: number): number {
  const local = new Date(nowMs + offsetMs);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
}

function fromCadence(due: DueReachOut, bucket: SuggestionBucket): DailySuggestion {
  return {
    contactId: due.id,
    name: due.name,
    title: due.title,
    companyName: due.companyName,
    bucket,
    reason: bucket === "daily" ? "Daily check-in" : `${cadenceLabel(due.everyDays)} · due to reconnect`,
    everyDays: due.everyDays,
    lastTouch: due.lastTouch,
  };
}

export async function buildDailySuggestions(
  options: { date?: Date; count?: number; prefs?: SchedulePrefs; busy?: BusyInterval[] } = {},
): Promise<DailySuggestionResult> {
  const now = options.date ?? new Date();
  const count = options.count ?? (await getDailySuggestionCount());
  const prefs = options.prefs ?? (await getSchedulePrefs());
  const busy = options.busy ?? [];

  const due = await listDueReachOuts();
  const picked: DailySuggestion[] = [];
  const seen = new Set<string>();

  // 1. Daily check-ins (cadence = Daily) always surface, capped at the count.
  for (const item of due.filter((entry) => entry.everyDays <= 1)) {
    if (picked.length >= count) break;
    if (seen.has(item.id)) continue;
    picked.push(fromCadence(item, "daily"));
    seen.add(item.id);
  }

  // 2. Periodic cadence spread across the next 7 days; today's bucket fills next.
  //    Per-day capacity drops by that day's meeting count, so a busy day (from
  //    the connected calendar) is assigned fewer people.
  const offsetMs = prefs.utcOffsetMinutes * 60_000;
  const weekStartMs = localMidnight(now.getTime(), offsetMs);
  const baseCapacity = Math.max(0, count - picked.length);
  const dayCapacities = Array.from({ length: 7 }, (_, i) => {
    const noon = new Date(weekStartMs + i * DAY_MS + 12 * 3_600_000);
    const load = dayLoad({ day: noon, busy, utcOffsetMinutes: prefs.utcOffsetMinutes });
    return Math.max(0, baseCapacity - load.meetingCount);
  });
  const spread = spreadAcrossWeek<DueReachOut>({
    items: due.filter((entry) => entry.everyDays > 1).map((entry) => ({ id: entry.id, item: entry })),
    weekStart: new Date(weekStartMs),
    perDay: baseCapacity,
    dayCapacities,
  });
  for (const item of spread.days[0].items) {
    if (picked.length >= count) break;
    if (seen.has(item.id)) continue;
    picked.push(fromCadence(item, "cadence"));
    seen.add(item.id);
  }

  // 3. Fill any leftover slot purely by graph traversal (degree centrality),
  //    rotating by day so the same well-connected contact isn't shown daily.
  const remaining = count - picked.length;
  if (remaining > 0) {
    const excludeIds = [...new Set([...seen, ...due.map((entry) => entry.id)])];
    const pool = await listGraphFallbackCandidates(excludeIds, remaining * 3 + 3);
    const dayNumber = Math.floor(weekStartMs / DAY_MS);
    for (let i = 0; i < remaining && i < pool.length; i++) {
      const candidate = pool[(i + dayNumber) % pool.length];
      if (seen.has(candidate.contactId)) continue;
      picked.push({
        contactId: candidate.contactId,
        name: candidate.name,
        title: candidate.title,
        companyName: candidate.companyName,
        bucket: "graph",
        reason: `${candidate.degree} connection${candidate.degree === 1 ? "" : "s"} in your network`,
        everyDays: null,
        lastTouch: null,
      });
      seen.add(candidate.contactId);
    }
  }

  return { suggestions: picked, count };
}
