import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  transpilePackages: ["@geoeval/api-client"],
};

export default nextConfig;
