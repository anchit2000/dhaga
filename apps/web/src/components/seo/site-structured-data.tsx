import type { ReactElement } from "react";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  GITHUB_REPO_URL,
} from "@/utils/constants/site";

// Site-wide JSON-LD (Organization + WebSite). Per-page BlogPosting/Article and
// BreadcrumbList structured data is emitted by the blog/docs routes, not here.
// No WebSite SearchAction is declared because the marketing site has no public
// search endpoint — fabricating one would fail validation and mislead crawlers.
const organizationLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: SITE_DESCRIPTION,
  sameAs: [GITHUB_REPO_URL],
};

const websiteLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export function SiteStructuredData(): ReactElement {
  return (
    <>
      {/* Static, developer-authored payloads — no user input, safe to inline. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
    </>
  );
}
