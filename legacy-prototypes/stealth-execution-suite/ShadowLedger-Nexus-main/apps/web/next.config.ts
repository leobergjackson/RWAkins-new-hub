// Built by vsrupeshkumar
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["database"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
