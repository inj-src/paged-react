import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^paged-react\/styles\.css$/,
        replacement: fileURLToPath(
          new URL("../../packages/paged-react/src/styles.css", import.meta.url),
        ),
      },
      {
        find: /^paged-react$/,
        replacement: fileURLToPath(
          new URL("../../packages/paged-react/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
});
