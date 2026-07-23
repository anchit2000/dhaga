import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { blogBaseOptions } from "@/lib/docs/shared";
import { blogSource } from "@/lib/blog-source";
import type { ReactNode } from "react";

// Mirrors the `/docs` layout (see src/app/docs/layout.tsx): `theme.enabled:
// false` because the app root layout already owns next-themes; search disabled
// (no search backend wired). Pointed at the blog source + blog nav options.
export default function BlogRootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout tree={blogSource.pageTree} {...blogBaseOptions}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
