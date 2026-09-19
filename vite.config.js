import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const htmlPages = Object.fromEntries(
  readdirSync(__dirname)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [
      file.replace(".html", ""),
      resolve(__dirname, file),
    ])
);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-legacy-header-script",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "script.js",
          source: readFileSync(
            resolve(__dirname, "script.js"),
            "utf8"
          ),
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: htmlPages,
    },
  },
});
