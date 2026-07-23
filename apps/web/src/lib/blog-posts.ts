import { blogSource } from "@/lib/blog-source";
import { BLOG_CATEGORY_SLUGS } from "@/utils/constants/blog-categories";

// Post-list helpers on top of the raw Fumadocs blog source. Centralised so the
// catch-all route, the auto-generated landings, the RSS feed, and the OG image
// all agree on what counts as a leaf post, how posts are categorised, and how
// they sort. Server-only (imports the generated .source); never pull into a
// "use client" component.
export interface BlogPost {
  url: string;
  slugs: string[];
  category: string;
  title: string;
  description: string;
  date?: string;
  author: string;
  tags: string[];
}

// Byline used when a post omits `author` frontmatter. Exported so the route and
// SEO helpers share one source of truth rather than re-typing the string.
export const BLOG_DEFAULT_AUTHOR = "Anchit Shrivastava";

// A route is a hub/index (not a leaf post) when it's the /blog root or a
// category landing (/blog/<category>). Everything else — including any future
// root-level post — is a leaf that gets the full article treatment. This is the
// single source of truth for the "is this a post?" decision, replacing the old
// slug.length >= 2 heuristic that mis-classified root-level posts.
export function isBlogIndexRoute(slug: string[] | undefined): boolean {
  if (!slug || slug.length === 0) return true;
  return slug.length === 1 && BLOG_CATEGORY_SLUGS.includes(slug[0]);
}

function resolveCategory(slugs: string[]): string {
  const first = slugs[0];
  return first && BLOG_CATEGORY_SLUGS.includes(first) ? first : "general";
}

function compareByDateDesc(a: BlogPost, b: BlogPost): number {
  // Undated posts sort last; otherwise newest first (ISO strings sort lexically).
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

// All leaf posts across every category, newest first.
export function getAllPosts(): BlogPost[] {
  return blogSource
    .getPages()
    .filter((page) => !isBlogIndexRoute(page.slugs))
    .map((page) => ({
      url: page.url,
      slugs: page.slugs,
      category: resolveCategory(page.slugs),
      title: page.data.title ?? "Untitled",
      description: page.data.description ?? "",
      date: page.data.date,
      author: page.data.author ?? BLOG_DEFAULT_AUTHOR,
      tags: page.data.tags ?? [],
    }))
    .sort(compareByDateDesc);
}

// Leaf posts within one category, newest first.
export function getPostsByCategory(categorySlug: string): BlogPost[] {
  return getAllPosts().filter((post) => post.category === categorySlug);
}

// Human-readable post date (e.g. "3 July 2026"). Returns null for undated posts
// so callers can omit the byline entirely rather than render a placeholder.
export function formatDisplayDate(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
