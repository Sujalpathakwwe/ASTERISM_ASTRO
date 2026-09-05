import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "fs";
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
  plugins: [react()],
  build: {
    rollupOptions: {
      input: htmlPages,
    },
  },
});