import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // @rescufood/ui installs its own node_modules with its own React copy;
      // its @base-ui/react sub-dependency otherwise loads that copy instead
      // of this package's, causing an Invalid hook call. dedupe alone isn't
      // enough because Vitest externalizes node_modules deps via plain Node
      // resolution, so force the import specifier itself to this package's copy.
      "react": path.resolve(import.meta.dirname, "node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
    },
    // @rescufood/ui and the sdks are file: deps symlinked in from outside
    // this package; without this Vite resolves their realpath and can't
    // see this package's node_modules for their own dependencies.
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    env: {
      // cognito.ts derives region/userPoolId/secretHash from these at
      // import time, so they must be set before any spec imports it.
      AUTH_COGNITO_ISSUER:
        "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_test123",
      AUTH_COGNITO_ID: "test-client-id",
      AUTH_COGNITO_SECRET: "test-client-secret",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.spec.{ts,tsx}",
        "src/app/layout.tsx",
        "src/app/api/auth/[...nextauth]/route.ts",
        "src/lib/utils.ts", // shadcn/ui boilerplate (cn helper), not app code
      ],
    },
    server: {
      // @rescufood/ui and @base-ui/react are otherwise externalized to
      // plain Node require, which bypasses the react alias above and
      // loads @rescufood/ui's own React copy instead of this package's.
      deps: {
        inline: [/@rescufood\/ui/, /@base-ui\//],
      },
    },
  },
});
