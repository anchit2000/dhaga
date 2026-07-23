import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utils/constants/site";

// Allow crawling of all public content; keep the authed app and API surface out
// of the index. Points crawlers at the source-driven sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
