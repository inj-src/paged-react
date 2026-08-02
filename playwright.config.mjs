import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./packages/paged-react/tests",
  testMatch: "**/*.playwright.spec.mjs",
  timeout: 30_000,
  use: {
    browserName: "chromium",
    headless: true,
  },
});
