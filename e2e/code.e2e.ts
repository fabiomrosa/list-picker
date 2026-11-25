import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The demos' code (L5.15): under each demo, the files that run it, read from the repository and
// highlighted at build time, in tabs, each with a copy button.
const SITE = "http://localhost:5181/list-picker/";
const PAGES: [string, string[]][] = [
  ["board.html", ["board.ts", "saving.ts", "fake-server.ts"]],
  ["react-demo.html", ["react-demo.tsx", "saving.ts", "fake-server.ts"]],
  ["player.html", ["player.ts"]],
  ["player-react.html", ["player-react.tsx"]],
];
const source = (file: string) => readFileSync(new URL(`../site/${file}`, import.meta.url), "utf8");

test("each demo page shows its files, as in the repository", async ({ page }) => {
  for (const [path, files] of PAGES) {
    await page.goto(SITE + path);
    const code = page.getByRole("region", { name: "The code" });
    await expect(code.getByRole("radio")).toHaveCount(files.length);
    for (const file of files) {
      await code.getByText(file, { exact: true }).click();
      const shown = code.locator("pre:visible code");
      await expect(shown, `${path}: ${file}`).toHaveCount(1);
      expect((await shown.innerText()).trim(), `${path}: ${file}`).toBe(source(file).trim());
    }
  }
});

test("a file's copy button copies it; no sideways scroll at 320px", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${SITE}board.html`);
  const code = page.getByRole("region", { name: "The code" });
  await code.getByText("saving.ts", { exact: true }).click();
  await code.locator("pre:visible").getByRole("button", { name: "Copy saving.ts" }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).trim()).toBe(
    source("saving.ts").trim(),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
