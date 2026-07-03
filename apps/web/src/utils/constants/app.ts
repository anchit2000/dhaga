/** App-shell constants (the product UI under /app, not the landing page). */

export const SESSION_COOKIE = "dhaga_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const APP_NAV_LINKS = [
  { href: "/app", label: "Home" },
  { href: "/app/people", label: "People" },
  { href: "/app/sessions", label: "Sessions" },
  { href: "/app/graph", label: "Graph" },
  { href: "/app/search", label: "Search" },
  { href: "/app/quick-add", label: "Quick add" },
] as const;

/** Free-tier cloud AI action cap per calendar month (BRD §8.3). */
export const FREE_TIER_AI_ACTIONS_PER_MONTH = 25;

export const CONTACT_SOURCES = ["manual", "quick_add"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** Keep-in-touch cadence choices (ideas.md #2). */
export const CADENCE_OPTIONS = [
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Twice a year", days: 180 },
  { label: "Yearly", days: 365 },
] as const;
