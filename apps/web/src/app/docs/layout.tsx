import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { docsBaseOptions } from "@/lib/docs/shared";
import { buildTrackedTree } from "@/lib/docs/tracks";
import { source } from "@/lib/source";
import type { ReactNode } from "react";

// Split the flat docs tree into two sidebar contexts (Product guide vs.
// Developer). `source.pageTree` is static, so the transform runs once here.
const trackedTree = buildTrackedTree(source.pageTree);

// `theme.enabled: false` — the app's root layout already owns a next-themes
// provider (`.dark` class); Fumadocs must defer to it, not mount a second one.
// Search is disabled (no search backend wired) — see docs follow-ups.
export default function DocsRootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout tree={trackedTree} {...docsBaseOptions}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
