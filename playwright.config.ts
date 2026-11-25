import { defineConfig } from "@playwright/test";

// Real drags in the installed Chrome (GitHub's Ubuntu runner has it too): nothing to download.
export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  // A committed `test.only` would silently skip the rest of the suite.
  forbidOnly: true,
  use: {
    // `E2E_BROWSER=webkit npm run e2e`: the same suite in WebKit (installed by Playwright), by hand.
    ...(process.env.E2E_BROWSER === "webkit"
      ? { browserName: "webkit" as const }
      : { channel: "chrome" }),
    baseURL: "http://localhost:5180",
    // Real scrollbars take room, as for users (headless Chrome hides them by default).
    launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
  },
  webServer: [
    {
      command: "npx vite playground --port 5180 --strictPort",
      url: "http://localhost:5180",
      reuseExistingServer: false,
    },
    // The site, for the home's live board (`e2e/home.e2e.ts`).
    {
      command: "npx vite site --port 5181 --strictPort",
      url: "http://localhost:5181/list-picker/",
      reuseExistingServer: false,
    },
  ],
});
