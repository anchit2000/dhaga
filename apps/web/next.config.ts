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
  // The founder story moved from /blog/why-i-built-dhaga into the General
  // category (/blog/general/why-i-built-dhaga). Keep the old URL reachable for
  // external links and anything still pointing at it.
  async redirects() {
    return [
      {
        source: "/blog/why-i-built-dhaga",
        destination: "/blog/general/why-i-built-dhaga",
        permanent: true,
      },
    ];
  },
  // Cross-origin isolation for the /app routes only, so Dhaga Voice's on-device
  // ASR can use WebGPU + threaded WASM (SharedArrayBuffer). Scoped to /app/**
  // so the marketing/blog/docs pages (which embed cross-origin media and third-
  // party frames) keep loading normally. COEP: credentialless — not require-corp
  // — lets the model files load from the HF CDN without per-asset CORP headers.
  async headers() {
    return [
      {
        // /app is cross-origin isolated for on-device voice. A dedicated
        // worker must opt into the same COEP policy or Chrome blocks its 200
        // response before MapLibre can execute it (ERR_BLOCKED_BY_RESPONSE).
        source: "/maplibre/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
      {
        source: "/app/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
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
