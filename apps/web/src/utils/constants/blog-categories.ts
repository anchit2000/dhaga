// The three top-level blog categories. Each maps to a folder under
// content/blog/ (engineering/, solutions/, general/) and to the auto-generated
// category landing rendered by the /blog catch-all route. `slug` is the first
// path segment; `label` is the sidebar/landing title (note "solutions" shows as
// "By profession"). Keep in sync with the folders and their meta.json titles.
export interface BlogCategory {
  slug: string;
  label: string;
  description: string;
}

export const BLOG_CATEGORIES: readonly BlogCategory[] = [
  {
    slug: "engineering",
    label: "Engineering",
    description:
      "Deep dives on the hardest problems we solved building Dhaga — each opens with a plain-language summary, then drops into the real engineering, with links to the exact code that shipped.",
  },
  {
    slug: "solutions",
    label: "By profession",
    description:
      "How Dhaga fits specific lines of work — the daily relationship problems each one faces, and how capture, the knowledge graph, natural-language recall, and proactive intelligence map onto them.",
  },
  {
    slug: "general",
    label: "General",
    description:
      "The story behind Dhaga and the ideas that shape it — why an AI-native personal CRM, and what we believe about who should own their relationship data.",
  },
];

export const BLOG_CATEGORY_SLUGS: readonly string[] = BLOG_CATEGORIES.map(
  (category) => category.slug,
);
