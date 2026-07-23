import type { MetadataRoute } from "next";
import { blogSource } from "@/lib/blog-source";
import { source } from "@/lib/source";
import { SITE_URL, MARKETING_SITEMAP_ROUTES } from "@/utils/constants/site";

// Source-driven sitemap: marketing routes are the only curated list; every blog
// and docs entry is enumerated from its content source so new content shows up
// automatically. /app/** and /api/** are never emitted (they aren't content
// sources and are disallowed in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const marketing: MetadataRoute.Sitemap = MARKETING_SITEMAP_ROUTES.map(
    (route) => ({
      url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  const blog: MetadataRoute.Sitemap = blogSource.getPages().map((page) => {
    const date = page.data.date;
    return {
      url: `${SITE_URL}${page.url}`,
      lastModified: date ? new Date(date) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    };
  });

  const docs: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...marketing, ...blog, ...docs];
}
