import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @dhaga/core ships raw TypeScript; Next transpiles it in-place.
  transpilePackages: ["@dhaga/core"],
};

export default nextConfig;
