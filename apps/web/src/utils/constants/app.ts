/** App-shell constants (the product UI under /app, not the landing page). */

import { BookOpen, Building2, CalendarDays, CirclePlus, Gift, GitMerge, Home, Inbox, MapPin, Newspaper, Shapes, Sparkles, Star, Upload, Users, Waypoints } from "lucide-react";
import type { CaptureImageType } from "@dhaga/core/src/api/capture";
import type { RecentReason } from "@/lib/repo/last-touch";
import { PLAN_AI_CREDITS_PER_MONTH } from "./plans";

export const SESSION_COOKIE = "dhaga_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Primary nav pills, always visible. */
export const APP_NAV_LINKS = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/confirmations", label: "Confirmations", icon: Inbox },
  { href: "/app/graph", label: "Graph", icon: Waypoints },
  { href: "/app/map", label: "Map", icon: MapPin },
] as const;

/**
 * Secondary destinations, tucked under the nav's "More" menu. The trailing
 * entries (Blog, Docs) point outside the /app tree; MoreMenu separates them
 * from the in-app pages with a divider.
 */
export const APP_MORE_LINKS = [
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/companies", label: "Companies", icon: Building2 },
  { href: "/app/saved", label: "Saved", icon: Star },
  { href: "/app/events", label: "Events", icon: CalendarDays },
  { href: "/app/entities", label: "Entities", icon: Shapes },
  { href: "/app/quick-add", label: "Quick add", icon: CirclePlus },
  { href: "/app/import", label: "Import", icon: Upload },
  { href: "/app/sync/conflicts", label: "Sync conflicts", icon: GitMerge },
  { href: "/app/wrapped", label: "Wrapped", icon: Sparkles },
  { href: "/app/referral", label: "Invite friends", icon: Gift },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

export const HOME_PREVIEW_LIMIT = 5;

/** Badge wording for a "Recent people" row's `reason` (repo/last-touch.ts). */
export const RECENT_REASON_LABELS: Record<RecentReason, string> = {
  added: "recently added",
  interacted: "recently interacted",
};

/**
 * Free-tier cloud AI credit cap per calendar month (BRD §8.3), and the
 * shipped floor of the whole cap ladder. Free gets a real, small taste of
 * cloud AI — 10 credits buys 10 card scans, or 5 scans plus 5 notes, or 5
 * Ask-Dhaga questions (per-action prices: `packages/core/src/metering/
 * credits.ts`). Deep research is 20, so it never fits in a free month, and
 * enrichment/briefs stay feature-gated to paid plans regardless (PLAN_FEATURES).
 *
 * Derived from PLAN_AI_CREDITS_PER_MONTH.free so the free tier has ONE number:
 * an admin re-sizing "Free" at /app/admin/ai-credits overrides it at runtime,
 * and `DHAGA_AI_MONTHLY_CAP` seeds it when nothing is set in the DB (see
 * lib/ai/metering/cap/index.ts).
 */
export const FREE_TIER_AI_CREDITS_PER_MONTH = PLAN_AI_CREDITS_PER_MONTH.free ?? 0;

export const CONTACT_SOURCES = ["manual", "quick_add", "import", "messaging"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** Accepted card-photo formats (scan input and stored visual receipts). */
export const CARD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const satisfies readonly CaptureImageType[];
export type CardImageType = (typeof CARD_IMAGE_TYPES)[number];

/** Max raw byte size of a single uploaded card photo (~6 MB). */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Long edge (px) and JPEG quality a card photo is downscaled to before upload.
 * Measured against a real card: 1600px cost ~0.5s more per scan than 1024px for
 * identical extraction, and 768px started misreading digits in phone numbers.
 * 1024 is the point where accuracy still holds — don't lower it without
 * re-running the check in docs/TESTING.md §7c.
 */
export const CARD_SCAN_MAX_DIMENSION = 1024;
export const CARD_SCAN_JPEG_QUALITY = 0.8;

/**
 * Max photos merged into ONE contact per scan — front+back of a card, or a
 * few pages of the same leaflet. They all describe the same person; the
 * server merges them and keeps each as a visual receipt.
 */
export const MAX_CARD_IMAGES = 6;

/**
 * How long an undated follow-up sits before its chip reads "due for long".
 * Undated items are ordered oldest-first, so this is the point where age is
 * the message rather than a detail.
 */
export const FOLLOW_UP_LONG_OPEN_DAYS = 14;

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
