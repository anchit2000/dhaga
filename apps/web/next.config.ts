import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @dhaga/core ships raw TypeScript; Next transpiles it in-place.
  transpilePackages: ["@dhaga/core"],
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

export default nextConfig;
