import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The web/ directory, so turbopack can reach the linked sdk and ui
// packages that live outside this app's directory.
const workspaceRoot = path.join(__dirname, "..");

// Reload Next's env from web/.env, shared by both web apps.
loadEnvConfig(workspaceRoot, process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  output: "standalone",
  // forbidden() and app/forbidden.tsx
  experimental: { authInterrupts: true },
  transpilePackages: [
    "@rescufood/listings-sdk",
    "@rescufood/profile-sdk",
    "@rescufood/ui",
  ],
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
