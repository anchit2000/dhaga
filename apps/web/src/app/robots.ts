import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utils/constants/site";

// Allow crawling of all public content; keep the authed app and API surface out
// of the index. Points crawlers at the source-driven sitemap.
//
// One allow-all rule, deliberately: Dhaga is open source and wants to be
// discoverable by LLM crawlers, so there are no per-AI-bot exclusions here.
// The disallow list is only for routes that must never be indexed:
//   /app/, /api/            the authed product and its API surface
//   /wrapped/               public HMAC-token share cards — unlisted by design
//   /r/                     referral redirect handler, not a page
//   /auth/, /reset-password, /forgot-password
//                           transactional flows with no SEO value (they're
//                           also absent from MARKETING_SITEMAP_ROUTES)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/api/",
        "/wrapped/",
        "/r/",
        "/auth/",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
