import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Enable standalone output for Docker optimization
  output: "standalone",
};

export default nextConfig;
