import { ACTIVITY_NOW_WINDOW_MS } from "@/utils/constants/app";

/** Mesh-style chronological grouping for the Home activity feed. */
export type TimeBucketLabel = "Now" | "Today" | "Yesterday" | "Earlier";

const BUCKET_ORDER: TimeBucketLabel[] = ["Now", "Today", "Yesterday", "Earlier"];
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

function startOfDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function bucketFor(timestamp: Date, now: number): TimeBucketLabel {
  if (now - timestamp.getTime() < ACTIVITY_NOW_WINDOW_MS) return "Now";
  const day = startOfDay(timestamp.getTime());
  const today = startOfDay(now);
  if (day === today) return "Today";
  if (day === today - DAY_MS) return "Yesterday";
  return "Earlier";
}

/** Buckets already-sorted (newest first) items under time headers, in
 *  Now → Today → Yesterday → Earlier order, dropping empty buckets. */
export function groupByTimeBucket<T extends { timestamp: Date }>(
  items: T[],
  now: number = Date.now(),
): { label: TimeBucketLabel; items: T[] }[] {
  const buckets = new Map<TimeBucketLabel, T[]>();
  for (const item of items) {
    const label = bucketFor(item.timestamp, now);
    const list = buckets.get(label);
    if (list) list.push(item);
    else buckets.set(label, [item]);
  }
  return BUCKET_ORDER.filter((label) => buckets.has(label)).map((label) => ({
    label,
    items: buckets.get(label) as T[],
  }));
}

/** Short trailing timestamp for one feed row ("2m ago", "3h ago", "Jan 5"). */
export function formatRelativeTimestamp(timestamp: Date, now: number = Date.now()): string {
  const diff = now - timestamp.getTime();
  if (diff < MINUTE_MS) return "just now";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h ago`;
  const days = Math.floor(diff / DAY_MS);
  if (days < 7) return `${days}d ago`;
  return timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
