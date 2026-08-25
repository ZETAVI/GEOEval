import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@geoeval/api-client"],
};

export default nextConfig;
