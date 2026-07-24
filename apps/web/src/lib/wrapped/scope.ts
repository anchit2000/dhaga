import type {
  WrappedScope,
  WrappedScopeKind,
  WrappedScopeOption,
} from "@dhaga/core/src/api/wrapped";

/**
 * Pure scope→window resolution for Network Wrapped. Fixed calendar/rolling
 * windows only; the `event` kind carries no date window (the repo resolves its
 * label + membership from the events table directly).
 */

const DAY_MS = 86_400_000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface ResolvedWindow {
  label: string;
  /** Inclusive lower bound; null means "no lower bound" (all-time). */
  start: Date | null;
  /** Exclusive upper bound; null means "up to now". */
  end: Date | null;
}

export const WRAPPED_SCOPE_KINDS: readonly WrappedScopeKind[] = [
  "event",
  "week",
  "month",
  "quarter",
  "year",
  "all",
];

/** Marquee default for the /app studio + the API when no kind is given. */
export const WRAPPED_DEFAULT_SCOPE_KIND: WrappedScopeKind = "year";

/** The fixed (non-event) options the scope picker always offers, in order. */
export const WRAPPED_WINDOW_OPTIONS: readonly WrappedScopeOption[] = [
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "quarter", label: "This quarter" },
  { kind: "year", label: "This year" },
  { kind: "all", label: "All time" },
];

export function isWrappedScopeKind(value: string | null): value is WrappedScopeKind {
  return value !== null && (WRAPPED_SCOPE_KINDS as readonly string[]).includes(value);
}

export function resolveScope(scope: WrappedScope): ResolvedWindow {
  const now = new Date();
  const reference = scope.anchor ? new Date(scope.anchor) : now;
  const anchor = Number.isNaN(reference.getTime()) ? now : reference;
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();

  switch (scope.kind) {
    case "week":
      return { label: "This week", start: new Date(now.getTime() - 7 * DAY_MS), end: now };
    case "month":
      return {
        label: `${MONTH_NAMES[month]} ${year}`,
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
      };
    case "quarter": {
      const quarter = Math.floor(month / 3);
      return {
        label: `Q${quarter + 1} ${year}`,
        start: new Date(Date.UTC(year, quarter * 3, 1)),
        end: new Date(Date.UTC(year, quarter * 3 + 3, 1)),
      };
    }
    case "year":
      return {
        label: `${year}`,
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year + 1, 0, 1)),
      };
    case "all":
      return { label: "All time", start: null, end: null };
    case "event":
      return { label: "Event", start: null, end: null };
  }
}
