import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // HiGHS WASM has `require('fs')` / `require('path')` behind a Node.js
      // runtime guard, but Turbopack resolves statically. Stub them out for
      // client bundles so the build succeeds (browser uses fetch for WASM).
      fs: { browser: './lib/stubs/empty.js' },
      path: { browser: './lib/stubs/empty.js' },
    },
  },
};

export default nextConfig;
