import { expect, type Page, test } from "@playwright/test";

// Saving the order (L5.13): the Board demo loads from a pretend server (`site/fake-server.ts`,
// the browser's storage, answers after a delay) and saves each move; a failed save puts the
// server's order back. The same tests for each page that draws it.
const PAGES = [["vanilla", "http://localhost:5181/list-picker/board.html"]] as const;

const order = (page: Page, list: string) =>
  page
    .locator(`[data-lp-cards="${list}"] [data-lp-card]`)
    .evaluateAll((all) => all.map((card) => card.getAttribute("data-lp-card")));
const card = (page: Page, id: string) => page.locator(`[data-lp-card="${id}"]`);
const requests = (page: Page) => page.locator("#requests li");

/** Moves card `a` from To do to Doing (first) with the keyboard. */
async function moveA(page: Page) {
  await card(page, "a").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
}

for (const [name, DEMO] of PAGES) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(DEMO);
      await expect(card(page, "a")).toBeVisible();
    });

    test("a move is saved: after a reload the card is where it was put", async ({ page }) => {
      await moveA(page);
      await expect(requests(page).first()).toContainText("PATCH /cards/a");
      await expect(requests(page).first()).toContainText("200");
      await page.reload();
      await expect(card(page, "a")).toBeVisible();
      expect(await order(page, "doing")).toEqual(["a", "d", "e"]);
      expect(await order(page, "todo")).toEqual(["b", "c"]);
    });

    test("a failed save is shown at once, then undone with a notice", async ({ page }) => {
      await page.getByLabel("Fail the next save").check();
      await moveA(page);
      expect(await order(page, "doing")).toEqual(["a", "d", "e"]); // shown at once
      // The failed save, then the board asked for again (newest first).
      await expect(requests(page).nth(1)).toContainText("PATCH /cards/a");
      await expect(requests(page).nth(1)).toContainText("500");
      await expect(requests(page).first()).toContainText("GET /board");
      await expect.poll(() => order(page, "todo")).toEqual(["a", "b", "c"]);
      expect(await order(page, "doing")).toEqual(["d", "e"]);
      await expect(page.locator("#board-status")).toContainText("Not saved");
      await expect(page.getByLabel("Fail the next save")).not.toBeChecked();
    });

    test("reset brings back the starting board", async ({ page }) => {
      await moveA(page);
      await expect(requests(page).first()).toContainText("200");
      await page.getByRole("button", { name: "Reset the data" }).click();
      await expect.poll(() => order(page, "todo")).toEqual(["a", "b", "c"]);
      await page.reload();
      await expect(card(page, "a")).toBeVisible();
      expect(await order(page, "todo")).toEqual(["a", "b", "c"]);
    });
  });
}
