/**
 * Growth-surface constants (Network Wrapped + referral advocate screens).
 * Brand colours live in COLORS ("@/utils/constants") — read them there, never
 * redefined here. This file holds only the NEW fixed values these screens need.
 */
import type { WrappedScopeKind } from "@dhaga/core/src/api/wrapped";

/**
 * Fixed rolling/calendar windows offered as scope chips on the Wrapped screen.
 * Event scopes aren't offered on mobile (the /api/wrapped response carries no
 * event list) — an event Wrapped is picked on web. The server produces the
 * human `scopeLabel` for whichever kind is requested.
 */
export const WRAPPED_SCOPE_OPTIONS: ReadonlyArray<{ kind: WrappedScopeKind; label: string }> = [
  { kind: "week", label: "This week" },
  { kind: "month", label: "This month" },
  { kind: "year", label: "This year" },
  { kind: "all", label: "All time" },
];

/** Scope the Wrapped screen opens on. */
export const WRAPPED_DEFAULT_SCOPE_KIND: WrappedScopeKind = "month";
