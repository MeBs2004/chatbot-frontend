import { defineConfig } from "vite";

// Builds the embeddable loader (src/widget/loader.js) as a single
// classic script, dist/widget.js, published at <widget-cdn>/widget.js.
// Runs after the app build (see package.json), so emptyOutDir is off.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: "src/widget/loader.js",
      formats: ["iife"],
      name: "NuformlyWidgetLoader",
      fileName: () => "widget.js",
    },
  },
});
