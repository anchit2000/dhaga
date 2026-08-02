import type { MetadataRoute } from "next";

// Canonical public site URL — the single source of truth for absolute URLs
// across metadata, sitemap, robots, JSON-LD, and share links. Overridable per
// environment via NEXT_PUBLIC_SITE_URL; falls back to the production deployment.
// Any trailing slash is stripped: this is an origin that gets `/path` appended
// by raw concatenation (e.g. share links `${SITE_URL}/r/<code>`), so a trailing
// slash from the env var would produce a double slash (`//r/...`).
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.dhaga.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Dhaga";

// Canonical source repository — used as the Organization `sameAs` link.
export const GITHUB_REPO_URL = "https://github.com/anchit2000/dhaga";

export const SITE_DESCRIPTION =
  "Dhaga is a private, open-source personal CRM for founders and " +
  "relationship-driven professionals: capture meetings, notes, messages, " +
  "introductions, voice memos, and cards, remember the context, search the " +
  "network, and follow up at the right time.";

// Public, indexable marketing routes. Blog and docs pages are enumerated from
// their content sources in sitemap.ts, so they're intentionally absent here.
// Transactional/error routes (forgot-password, reset-password, auth/error) are
// deliberately excluded — no SEO value.
export const MARKETING_SITEMAP_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];
