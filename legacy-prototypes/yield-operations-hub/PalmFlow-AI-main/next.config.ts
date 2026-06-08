// Built by vsrupeshkumar
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Stub out Node.js built-ins that don't exist in the browser bundle
      fs: { browser: "./src/utils/empty-module.ts" },
      net: { browser: "./src/utils/empty-module.ts" },
      tls: { browser: "./src/utils/empty-module.ts" },
    },
  },
};

export default nextConfig;
