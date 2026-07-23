import { BLOG_SITE_URL } from "@/utils/constants/blog";
import { BLOG_CATEGORIES } from "@/utils/constants/blog-categories";

// SEO helpers for the blog route: canonical URL construction and the
// BlogPosting + BreadcrumbList JSON-LD for leaf posts. Site-wide
// Organization/WebSite JSON-LD is owned elsewhere (root layout), by design.

// Absolute canonical URL for a blog route from its catch-all slug.
export function blogAbsoluteUrl(slug: string[] | undefined): string {
  const path = (slug ?? []).join("/");
  return path ? `${BLOG_SITE_URL}/blog/${path}` : `${BLOG_SITE_URL}/blog`;
}

// Absolute URL of the dynamic social card for a blog route. Points at the
// /blog/og route handler with the title (and category, for the eyebrow) as
// query params — the OG image can't be a file-convention inside the optional
// catch-all segment.
export function blogOgImageUrl(title: string, slug: string[] | undefined): string {
  const params = new URLSearchParams({ title });
  const category = (slug ?? [])[0];
  if (category) params.set("category", category);
  return `${BLOG_SITE_URL}/blog/og?${params.toString()}`;
}

interface JsonLdInput {
  slug: string[] | undefined;
  title: string;
  description: string;
  url: string;
  author: string;
  date: string | undefined;
}

// Serialized [BlogPosting, BreadcrumbList] JSON-LD for a leaf post. Returns a
// string ready for a <script type="application/ld+json"> tag.
export function buildBlogJsonLd({
  slug,
  title,
  description,
  url,
  author,
  date,
}: JsonLdInput): string {
  const iso = date ? new Date(date).toISOString() : undefined;
  const blogPosting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "Dhaga" },
    mainEntityOfPage: url,
    url,
    ...(iso ? { datePublished: iso, dateModified: iso } : {}),
  };

  const category = (slug ?? [])[0];
  const categoryLabel =
    BLOG_CATEGORIES.find((entry) => entry.slug === category)?.label ?? category;
  const crumbs: { name: string; item: string }[] = [
    { name: "Home", item: `${BLOG_SITE_URL}/` },
    { name: "Blog", item: `${BLOG_SITE_URL}/blog` },
  ];
  if (category) {
    crumbs.push({ name: categoryLabel, item: `${BLOG_SITE_URL}/blog/${category}` });
  }
  crumbs.push({ name: title, item: url });

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };

  return JSON.stringify([blogPosting, breadcrumb]);
}
