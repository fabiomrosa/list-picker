import { defineConfig } from "@playwright/test";

// Real drags in the installed Chrome (GitHub's Ubuntu runner has it too): nothing to download.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  // A committed `test.only` would silently skip the rest of the suite.
  forbidOnly: true,
  use: {
    channel: "chrome",
    baseURL: "http://localhost:5180",
    // Real scrollbars take room, as for users (headless Chrome hides them by default).
    launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
  },
  webServer: {
    command: "npx vite playground --port 5180 --strictPort",
    url: "http://localhost:5180",
    reuseExistingServer: false,
  },
});
