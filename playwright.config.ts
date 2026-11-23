import { defineConfig } from "@playwright/test";

// Real drags in the installed Chrome (GitHub's Ubuntu runner has it too): nothing to download.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { channel: "chrome", baseURL: "http://localhost:5180" },
  webServer: {
    command: "npx vite playground --port 5180 --strictPort",
    url: "http://localhost:5180",
    reuseExistingServer: false,
  },
});
