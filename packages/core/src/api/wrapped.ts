/**
 * Types-only contract for **Network Wrapped** — the shareable, contact-free
 * "in review" card (per event, or per week/month/quarter/year/all-time).
 *
 * Deep-import this module directly (`@dhaga/core/src/api/wrapped`), never the
 * package barrel, so no server SDK is pulled into the mobile/RN bundle. There
 * is NO runtime code here — types only.
 *
 * PRIVACY (product moat, treat violations as bugs): the shareable artifact
 * carries COUNTS and non-identifying SUPERLATIVES only — never third-party
 * names. The single name-bearing field (`reveal`) is optional, shown only
 * behind an explicit in-app reveal, and is NEVER serialized into the
 * public share-image params.
 */

/** The dimension a Wrapped card summarises. */
export type WrappedScopeKind =
  | "event"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "all";

export interface WrappedScope {
  kind: WrappedScopeKind;
  /** Required when kind === "event": the events.id to summarise. */
  eventId?: string;
  /**
   * ISO date the client treats as "now" for rolling/calendar windows
   * (temporal-judgment parity — see packages/core llm/prompts/today.ts).
   * Server clamps to its own clock; this only disambiguates the user's window.
   */
  anchor?: string;
}

/** A shareable cluster is a CATEGORY (company/tag), never a person. */
export interface WrappedCluster {
  /** Display label of the category (company name or tag). */
  key: string;
  kind: "company" | "tag";
  count: number;
}

/**
 * All figures are deterministic aggregates (no LLM). Everything except
 * `reveal` is safe to render into a public, contact-free share card.
 */
export interface WrappedStats {
  scope: WrappedScope;
  /** Human label for the scope, e.g. "This month", "2026", "TechSparks 2025". */
  scopeLabel: string;
  /** Window bounds actually applied (ISO); null for scopes not date-bounded. */
  periodStart: string | null;
  periodEnd: string | null;

  newPeople: number; // new real contacts met in scope (excludes "mentioned" stubs)
  totalNetwork: number; // all-time real network size
  eventsAttended: number; // events falling in scope
  biggestEventCount: number; // people met at the single largest event in scope
  overdueFollowUps: number; // open follow-ups with a machine dueDate in the past
  notesWritten: number; // non-deleted notes created in scope
  newConnections: number; // non-deleted relationship edges added in scope

  /** Strongest cluster in scope — the CATEGORY only. Null when nothing qualifies. */
  topCluster: WrappedCluster | null;
  /** Top categories for the card's mini distribution bars (already privacy-safe). */
  clusters: WrappedCluster[];
  /** Busiest calendar month within scope (e.g. "March"). Non-identifying. */
  busiestMonth: string | null;

  /**
   * NAME-BEARING and reveal-gated. Present only for the signed-in owner's own
   * in-app view after an explicit reveal. MUST NOT be placed into any public
   * share URL, OG param, or rendered into the share image.
   */
  reveal?: {
    topCompanyName: string | null;
    mostConnectedName: string | null;
  };
}

/** Aspect ratios of the generated share image. */
export type WrappedCardFormat = "landscape" | "square" | "story";

/** Response of GET /api/wrapped (mobile + web owner view). */
export interface WrappedApiResponse {
  stats: WrappedStats;
  /**
   * Public, unfurlable share-page URL for this scope. Viewing the page and its
   * card image requires no auth; the card is contact-free by construction.
   */
  shareUrl: string;
}

/** Lightweight descriptor of a scope the user can pick (events + fixed windows). */
export interface WrappedScopeOption {
  kind: WrappedScopeKind;
  label: string;
  eventId?: string;
}
