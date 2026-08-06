import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utils/constants/site";

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Google-Extended",
] as const;

const PRIVATE_PATHS = [
  "/app",
  "/api",
  "/wrapped",
  "/r/",
  "/auth",
  "/reset-password",
  "/forgot-password",
];

// Allow crawling of all public content; keep the authed app and API surface out
// of the index. Points crawlers at the source-driven sitemap.
//
// Public pages are deliberately available to both search and AI discovery.
// Name the major AI agents explicitly so this policy cannot be misread as an
// accidental side effect of the wildcard rule. They get the same private-route
// boundary as every crawler; being AI does not grant access to /app or /api.
// The disallow list is only for routes that must never be indexed:
//   /app, /api              the authed product and its API surface
//   /wrapped                public HMAC-token share cards — unlisted by design
//   /r/                     referral redirect handler, not a page
//   /auth, /reset-password, /forgot-password
//                           transactional flows with no SEO value (they're
//                           also absent from MARKETING_SITEMAP_ROUTES)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      {
        userAgent: [...AI_CRAWLER_USER_AGENTS],
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
