import { GITHUB_URL } from "@/utils/constants/landing";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

// Shared Fumadocs layout options (nav brand mark + repo link). Kept in one
// place so the docs layout — and any future docs surface (home/notebook) —
// stay consistent.
export const docsBaseOptions: BaseLayoutProps = {
  githubUrl: GITHUB_URL,
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
