import path from "node:path";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The web/ directory, so turbopack can reach the linked sdk and ui
// packages that live outside this app's directory.
const workspaceRoot = path.join(__dirname, "..");

// Reload Next's env from web/.env, shared by both web apps.
loadEnvConfig(
  workspaceRoot,
  process.env.NODE_ENV !== "production",
  undefined,
  true,
);

// Sent on every response. CSP is left for its own change: Next's inline
// scripts need per-request nonces. COEP is omitted because require-corp
// would block the CloudFront listing images.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // forbidden() and app/forbidden.tsx
  experimental: { authInterrupts: true },
  images: {
    // Listing images are served from a CloudFront distribution
    remotePatterns: [{ protocol: "https", hostname: "*.cloudfront.net" }],
  },
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
