import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// The `/docs` content tree. Running `fumadocs-mdx` (postinstall + build) reads
// this and generates the typed `.source` bundle consumed by `src/lib/source.ts`.
export const docs = defineDocs({
  dir: "content/docs",
});

// The `/blog` content tree — the engineering blog. Separate collection from
// `docs` so posts live at `/blog`, not under the documentation sidebar.
// Consumed by `src/lib/blog-source.ts`.
export const blog = defineDocs({
  dir: "content/blog",
});

export default defineConfig();
