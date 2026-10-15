import { defineConfig } from "vite";
import { resolve } from "node:path";

const here = import.meta.dirname;

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(here, "index.html"),
        fill: resolve(here, "fill.html"),
      },
    },
  },
});
