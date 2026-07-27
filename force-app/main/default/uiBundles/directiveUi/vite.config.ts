// Vitest 4 no longer augments Vite's UserConfig with `test` via a triple-slash
// reference - the config must come from vitest/config to type-check.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import salesforce from "@salesforce/vite-plugin-ui-bundle";
import { fileURLToPath, URL } from "node:url";

// base "./" makes emitted asset URLs relative, so the built bundle works when
// served from the Salesforce UI Bundle static host instead of the domain root.
//
// The salesforce() plugin is REQUIRED, not optional: it is what makes `dist/`
// a bundle the platform can actually serve (it consumes ui-bundle.json and
// emits the artifacts the UI Bundle host expects). Without it the metadata
// deploys cleanly and the app still renders an empty "No Items" shell.
// It is also what pins us to Vite 7 - the plugin peer-depends on vite ^7.
export default defineConfig({
  base: "./",
  plugins: [react(), salesforce()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Sourcemaps ship inside the UIBundle and count toward its 2,500-file limit
    // (and roughly double dist/). The reference app disables them; so do we.
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
