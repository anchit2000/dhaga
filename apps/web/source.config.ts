import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

// The `/docs` content tree. Running `fumadocs-mdx` (postinstall + build) reads
// this and generates the typed `.source` bundle consumed by `src/lib/source.ts`.
export const docs = defineDocs({
  dir: "content/docs",
});

// The `/blog` content tree — the engineering blog. Separate collection from
// `docs` so posts live at `/blog`, not under the documentation sidebar.
// Consumed by `src/lib/blog-source.ts`. Extends the default docs frontmatter
// (title/description) with blog-only fields; all optional so posts without them
// still build while content is backfilled.
export const blog = defineDocs({
  dir: "content/blog",
  docs: {
    schema: frontmatterSchema.extend({
      date: z.string().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
});

export default defineConfig();
