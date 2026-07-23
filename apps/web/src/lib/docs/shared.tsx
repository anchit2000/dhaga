import { GITHUB_URL } from "@/utils/constants/landing";
import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";

// Top-nav links shared by both docs surfaces so a visitor who lands on /blog or
// /docs can always get back to the marketing site (Home) or the sibling surface.
const backToSiteLinks: LinkItemType[] = [
  { text: "Home", url: "/" },
  { text: "Blog", url: "/blog" },
  { text: "Docs", url: "/docs" },
];

// Shared Fumadocs layout options (nav brand mark + repo link). Kept in one
// place so the docs layout — and any future docs surface (home/notebook) —
// stay consistent.
export const docsBaseOptions: BaseLayoutProps = {
  githubUrl: GITHUB_URL,
  links: backToSiteLinks,
  nav: {
    title: (
      <span className="font-display text-lg tracking-tight">
        dhaga<span className="text-amber">.</span>
        <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-fog">
          docs
        </span>
      </span>
    ),
    url: "/docs",
    transparentMode: "none",
  },
};

// Same brand mark, pointed at the engineering blog surface.
export const blogBaseOptions: BaseLayoutProps = {
  githubUrl: GITHUB_URL,
  links: backToSiteLinks,
  nav: {
    title: (
      <span className="font-display text-lg tracking-tight">
        dhaga<span className="text-amber">.</span>
        <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-fog">
          blog
        </span>
      </span>
    ),
    url: "/blog",
    transparentMode: "none",
  },
};
