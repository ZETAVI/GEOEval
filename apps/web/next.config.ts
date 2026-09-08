import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolated review builds must not replace an already-running .next build.
  distDir: process.env.GEOEVAL_WEB_DIST_DIR ?? ".next",
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  transpilePackages: ["@geoeval/api-client"],
};

export default nextConfig;
