import path from "node:path";

import { createMDX } from "fumadocs-mdx/next";

import type { NextConfig } from "next";

// Fumadocs MDX wrapper — compiles `content/docs/**` and regenerates `.source`
// on build. Merged with (not replacing) the config below.
const withMDX = createMDX();

const nextConfig: NextConfig = {
  // Docker image builds only (the root Dockerfile sets DHAGA_STANDALONE=1):
  // emit a self-contained server at .next/standalone. Conditional because
  // `next start` — the bare-VPS path in docs/DEPLOYING.md — refuses to run
  // a standalone build, and Vercel doesn't need it.
  ...(process.env.DHAGA_STANDALONE === "1"
    ? {
        output: "standalone" as const,
        // Monorepo: trace from the repo root so the workspace packages
        // (@dhaga/core, @dhaga/ee) land in the standalone bundle.
        outputFileTracingRoot: path.join(__dirname, "../../"),
      }
    : {}),
  // @dhaga/core and @dhaga/ee ship raw TypeScript; Next transpiles them in-place.
  transpilePackages: ["@dhaga/core", "@dhaga/ee"],
  // Runtime-loaded native/WASM packages stay out of the bundle:
  // PGlite (WASM Postgres) and transformers.js (onnxruntime, local models).
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@electric-sql/pglite-pgvector",
    "pg",
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
};

export default withMDX(nextConfig);
