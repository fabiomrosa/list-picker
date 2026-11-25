import { expect, type Page, test } from "@playwright/test";

// The site's player (L4.25): one list, previous and next by `neighbours`, tick-to-swap by
// `swapCards`, the engine's drag and keyboard moves, a click to play.
const PLAYER = "http://localhost:5181/list-picker/player.html";

const order = (page: Page) =>
  page
    .locator("#playlist [data-lp-card]")
    .evaluateAll((all) => all.map((el) => el.querySelector(".track-title")?.textContent));
const track = (page: Page, title: string) =>
  page.locator("#playlist [data-lp-card]").filter({ hasText: title });
const now = (page: Page) => page.locator("#now-title");

test.beforeEach(async ({ page }) => {
  await page.goto(PLAYER);
  await expect(now(page)).toHaveText("Don't Panic");
});

test("previous and next step through the playlist in its current order", async ({ page }) => {
  await expect(page.locator("#prev")).toBeDisabled();
  await page.locator("#next").click();
  await expect(now(page)).toHaveText("Shiver");
  await page.locator("#prev").click();
  await expect(now(page)).toHaveText("Don't Panic");
  // Swap Don't Panic with Yellow: next now follows the new order.
  await track(page, "Don't Panic").locator("input").click();
  await track(page, "Yellow").locator("input").click();
  await expect
    .poll(() => order(page))
    .toEqual([
      "Yellow",
      "Shiver",
      "Spies",
      "Sparks",
      "Don't Panic",
      "Trouble",
      "Parachutes",
      "High Speed",
      "We Never Change",
      "Everything's Not Lost",
    ]);
  await page.locator("#next").click();
  await expect(now(page)).toHaveText("Trouble");
  await page.locator("#prev").click();
  await page.locator("#prev").click();
  await expect(now(page)).toHaveText("Sparks");
});

test("a tick then a tick on another swaps them; the same one twice unpicks it", async ({
  page,
}) => {
  await track(page, "Shiver").locator("input").click();
  await track(page, "Shiver").locator("input").click();
  await track(page, "Spies").locator("input").click();
  await track(page, "Trouble").locator("input").click();
  await expect
    .poll(async () => (await order(page)).slice(0, 6))
    .toEqual(["Don't Panic", "Shiver", "Trouble", "Sparks", "Yellow", "Spies"]);
  await expect(page.locator("#playlist input:checked")).toHaveCount(0);
  await expect(page.locator("#player-status")).toHaveText("Swapped Spies and Trouble");
});

test("a drag or a keyboard move reorders it; a click or Enter plays a track", async ({ page }) => {
  // The playlist in the middle of the window, away from the edges where a drag auto-scrolls.
  await track(page, "Spies").evaluate((el) => el.scrollIntoView({ block: "center" }));
  const from = await track(page, "Sparks").locator(".track-title").boundingBox();
  const to = await track(page, "Shiver").boundingBox();
  if (!from || !to) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => (await order(page)).slice(0, 3))
    .toEqual(["Don't Panic", "Sparks", "Shiver"]);
  await track(page, "Yellow").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  expect((await order(page)).indexOf("Yellow")).toBe(3);
  await track(page, "Trouble").locator(".track-title").click();
  await expect(now(page)).toHaveText("Trouble");
  await track(page, "Parachutes").focus();
  await page.keyboard.press("Enter");
  await expect(now(page)).toHaveText("Parachutes");
});

test("play runs the clock, and at a track's end goes on to the next in the current order", async ({
  page,
}) => {
  // A controlled clock: the pretend play runs ten times faster; runFor skips real waiting.
  await page.clock.install();
  await page.goto(PLAYER);
  await page.locator("#toggle").click();
  await expect(page.locator("#toggle")).toHaveAccessibleName("Pause");
  await page.clock.runFor(5_000);
  await expect(page.locator("#now-time")).toHaveText("0:50 / 2:17");
  // Swap Shiver away: after Don't Panic comes Trouble now.
  await track(page, "Shiver").locator("input").click();
  await track(page, "Trouble").locator("input").click();
  await page.clock.runFor(9_000);
  await expect(now(page)).toHaveText("Trouble");
  // Pause stops the clock.
  await page.locator("#toggle").click();
  const time = await page.locator("#now-time").textContent();
  await page.clock.runFor(5_000);
  await expect(page.locator("#now-time")).toHaveText(time ?? "");
});

test("with reduced motion the equalizer stands still while playing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#toggle").click();
  await expect(track(page, "Don't Panic").locator(".eq i").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});
