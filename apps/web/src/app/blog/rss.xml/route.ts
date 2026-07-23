import { getAllPosts } from "@/lib/blog-posts";
import { BLOG_SITE_URL } from "@/utils/constants/blog";

// RSS 2.0 feed for the blog. Lives at the exact path /blog/rss.xml as a route
// handler, so it takes precedence over the [[...slug]] catch-all page (a static
// segment beats a dynamic one) — no route conflict. All leaf posts, newest
// first, with canonical links and author bylines.
const FEED_URL = `${BLOG_SITE_URL}/blog/rss.xml`;
const BLOG_URL = `${BLOG_SITE_URL}/blog`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET(): Response {
  const posts = getAllPosts();
  const lastBuildDate = new Date().toUTCString();

  const items = posts
    .map((post) => {
      const pubDate = post.date ? new Date(post.date).toUTCString() : undefined;
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(post.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(post.url)}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <author>${escapeXml(post.author)}</author>`,
        ...post.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
        ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Dhaga blog</title>
    <link>${BLOG_URL}</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <description>Engineering deep dives and by-profession guides from Dhaga — the AI-native personal CRM.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
