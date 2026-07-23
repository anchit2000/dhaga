"use client";

import Giscus from "@giscus/react";
import type { ReactElement } from "react";

// Comments + reactions (likes) backed by GitHub Discussions via giscus. Renders
// nothing until the four NEXT_PUBLIC_GISCUS_* env vars are set (get them from
// giscus.app after enabling Discussions and installing the giscus GitHub App),
// so it's safe to ship unconfigured.
export function Comments(): ReactElement | null {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  if (!repo || !repoId || !category || !categoryId) return null;

  return (
    <section className="mt-12 border-t border-seam pt-8">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-fog">
        Discussion
      </h2>
      <Giscus
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="pathname"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="dark"
        lang="en"
        loading="lazy"
      />
    </section>
  );
}
