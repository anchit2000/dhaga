/** App-shell constants (the product UI under /app, not the landing page). */

import { BookOpen, CalendarDays, CirclePlus, Home, Newspaper, Shapes, Users, Waypoints } from "lucide-react";
import type { CaptureImageType } from "@dhaga/core/src/api/capture";

export const SESSION_COOKIE = "dhaga_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Primary nav pills, always visible. */
export const APP_NAV_LINKS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/graph", label: "Graph", icon: Waypoints },
] as const;

/**
 * Secondary destinations, tucked under the nav's "More" menu. The trailing
 * entries (Blog, Docs) point outside the /app tree; MoreMenu separates them
 * from the in-app pages with a divider.
 */
export const APP_MORE_LINKS = [
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/entities", label: "Entities", icon: Shapes },
  { href: "/app/quick-add", label: "Quick add", icon: CirclePlus },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

export const HOME_PREVIEW_LIMIT = 5;

/** Free-tier cloud AI action cap per calendar month (BRD §8.3). */
export const FREE_TIER_AI_ACTIONS_PER_MONTH = 25;

export const CONTACT_SOURCES = ["manual", "quick_add", "import"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** Accepted card-photo formats (scan input and stored visual receipts). */
export const CARD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const satisfies readonly CaptureImageType[];
export type CardImageType = (typeof CARD_IMAGE_TYPES)[number];

/** Keep-in-touch cadence choices (docs/ideas.md #2). */
export const CADENCE_OPTIONS = [
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Fortnightly", days: 15 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Twice a year", days: 180 },
  { label: "Yearly", days: 365 },
] as const;

/**
 * Relationship decay + strength (BRD §5.2 v1.2, §6.7 — own-graph data only).
 * Both are computed at read time from touches already in the graph; no jobs.
 */
export const DECAY_AFTER_DAYS = 240; // ≈ 8 months — BRD's "no contact in 8 months"

/** Days for the recency half of the strength score to halve. */
export const STRENGTH_HALF_LIFE_DAYS = 90;
/** Interactions inside this window feed the frequency half of the score. */
export const STRENGTH_WINDOW_DAYS = 365;
/** Interactions per window at which frequency saturates (score-wise). */
export const STRENGTH_SATURATION = 10;
/** Recency vs frequency blend; must sum to 1. */
export const STRENGTH_RECENCY_WEIGHT = 0.6;

/** Score bands, highest first. */
export const STRENGTH_BANDS = [
  { min: 70, label: "Strong" },
  { min: 40, label: "Warm" },
  { min: 15, label: "Cooling" },
  { min: 0, label: "Dormant" },
] as const;
export type StrengthLabel = (typeof STRENGTH_BANDS)[number]["label"];

/** How many "going quiet" contacts the Home feed shows before "+N more". */
export const QUIET_FEED_LIMIT = 8;

/**
 * Proactive-intelligence watchlist (BRD §5.2 v1.2, §6.7): job-change
 * detection + news alerts, both opt-in per contact. The cap bounds nightly
 * job cost (search + a classification call per watched contact), separate
 * from the monthly AI-action cap that throttles user-triggered calls.
 */
export const FREE_TIER_WATCHLIST_CAP = 0; // free plan has no `enrichment` feature at all
export const PRO_TIER_WATCHLIST_CAP = 25;

/** How many new signals the Home feed shows before "+N more". */
export const SIGNALS_FEED_LIMIT = 8;

/** How many notes/facts the Home feed's contact detail panel previews. */
export const CONTACT_SUMMARY_NOTE_LIMIT = 3;
export const CONTACT_SUMMARY_FACT_LIMIT = 3;

/**
 * Auto event grouping (M2, BRD §6.2): scans sharing a geohash-6 within this
 * rolling window join the same event instead of starting a new one.
 */
export const EVENT_CLUSTER_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Name given to an event auto-created by clustering, until the user renames it. */
export const NEW_EVENT_PLACEHOLDER_NAME = "New event";
