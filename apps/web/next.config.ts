import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @dhaga/core ships raw TypeScript; Next transpiles it in-place.
  transpilePackages: ["@dhaga/core"],
  // PGlite loads WASM + filesystem assets at runtime; keep it out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
