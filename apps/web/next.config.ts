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
        // Same failure class as /maplibre above, for the bundler's own worker
        // chunks. The graph's ForceAtlas2 worker (components/app/graph/layout/
        // worker-runner.ts) is bundled to /_next/static/chunks/turbopack-worker-
        // *.js, which matched no rule and so shipped with no COEP — Chrome
        // answered its own 200 with ERR_BLOCKED_BY_RESPONSE and the layout fell
        // back to a ~2.5s synchronous main-thread pass.
        //
        // Same-origin does NOT exempt it: HTML's "check a global object's
        // embedder policy" makes a dedicated worker a network error whenever the
        // owner document's COEP is compatible with cross-origin isolation
        // (credentialless counts) and the WORKER RESPONSE'S own COEP is not.
        // That check is about the worker's policy container, not CORP —
        // `Cross-Origin-Resource-Policy: same-origin` was A/B-tested here and
        // left the worker just as blocked.
        //
        // Blast radius is nil: COEP is only read when a response creates a
        // document or worker global. /_next/static serves JS, CSS, fonts and
        // media — never a document — so on every other asset the header is
        // inert, and marketing/blog/docs documents keep their own (unset) COEP
        // and their cross-origin frames and media.
        source: "/_next/static/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
      {
        source: "/app/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Settings opts BACK OUT of cross-origin isolation, and must stay after
        // the /app rule — Next applies the last matching header for a key.
        //
        // COEP blocks any cross-origin iframe whose document doesn't send COEP
        // itself; `credentialless` relaxes that for no-cors subresources, not
        // for nested frames. Razorpay's checkout frame sends no COEP, so Chrome
        // killed it with ERR_BLOCKED_BY_RESPONSE and painted its own error page
        // ("api.razorpay.com refused to connect") over an empty modal. Proven
        // by an A/B repro: identical page and subscription, these two headers
        // the only difference between a working modal and a dead frame.
        //
        // Costs nothing real: Moonshine ASR requires WebGPU (loadTiny() throws
        // without navigator.gpu), and WebGPU needs no cross-origin isolation.
        // Only the rare same-device WASM fallback loses threading, and only on
        // this route. Note dictation IS reachable here — AppNav mounts
        // SearchPalette, which wires useDictation, on every /app page — so the
        // reason this is safe is the WebGPU requirement, not the route.
        source: "/app/settings/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
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
