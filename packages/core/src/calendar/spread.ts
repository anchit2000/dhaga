/**
 * Distribute the week's due contacts across its 7 days so no single day is
 * overloaded ("follow-up weekly split across the week so we don't meet too many
 * people in one day"). Deterministic: identical inputs always yield the identical
 * assignment (a stable hash of item.id fixes the placement order), so the list a
 * user sees for a given day doesn't churn between page loads. Per-day capacities
 * let a calendar-busy day take fewer people. Pure — no I/O, no Math.random.
 */

const DAY_MS = 86_400_000;

export interface SpreadItem<T> {
  id: string;
  item: T;
}

export interface DayBucket<T> {
  day: Date;
  items: T[];
}

/** FNV-1a — a small, stable string hash (no crypto, no randomness). */
function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function spreadAcrossWeek<T>(params: {
  items: SpreadItem<T>[];
  weekStart: Date;
  perDay: number;
  dayCapacities?: number[];
}): { days: DayBucket<T>[]; overflow: T[] } {
  const weekStartMs = params.weekStart.getTime();
  const capacity = Array.from({ length: 7 }, (_, i) => params.dayCapacities?.[i] ?? params.perDay);
  const buckets: T[][] = Array.from({ length: 7 }, () => []);
  const overflow: T[] = [];

  // Stable order: sort by id hash (ties by id) so placement never depends on
  // input order or wall-clock time.
  const ordered = [...params.items].sort((a, b) => hashId(a.id) - hashId(b.id) || (a.id < b.id ? -1 : 1));

  for (const entry of ordered) {
    let best = -1;
    let bestRemaining = 0;
    for (let day = 0; day < 7; day++) {
      const remaining = capacity[day] - buckets[day].length;
      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        best = day;
      }
    }
    if (best === -1) {
      overflow.push(entry.item);
    } else {
      buckets[best].push(entry.item);
    }
  }

  const days = buckets.map((items, i) => ({ day: new Date(weekStartMs + i * DAY_MS), items }));
  return { days, overflow };
}
