import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@vladmandic/human"],
  turbopack: {},
};

export default nextConfig;
