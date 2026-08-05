import path from "node:path";

import type { NextConfig } from "next";

// The web/ directory, so turbopack can reach the linked web/sdk and
// web/ui packages that live outside this app's directory.
const workspaceRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@rescufood/profile-sdk", "@rescufood/ui"],
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
