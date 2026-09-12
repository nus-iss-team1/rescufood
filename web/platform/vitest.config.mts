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
    include: ["src/**/*.test.{ts,tsx}"],
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
