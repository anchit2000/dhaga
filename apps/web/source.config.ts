import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// The `/docs` content tree. Running `fumadocs-mdx` (postinstall + build) reads
// this and generates the typed `.source` bundle consumed by `src/lib/source.ts`.
export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig();
