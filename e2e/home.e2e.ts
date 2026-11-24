import { expect, type Locator, type Page, test } from "@playwright/test";

// The site's home (L4.15): its live board, drawn by `mount`, Doing capped at 3 with `canMove`.
const HOME = "http://localhost:5181/list-picker/";

/** The home board's lists, as the page shows them: list id → card ids. */
async function lists(page: Page): Promise<Record<string, string[]>> {
  return page
    .locator("#hero-board [data-lp-list]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((list) => [
          list.getAttribute("data-lp-list"),
          [...list.querySelectorAll("[data-lp-card]")].map((card) =>
            card.getAttribute("data-lp-card"),
          ),
        ]),
      ),
    );
}

const card = (page: Page, id: string) => page.locator(`#hero-board [data-lp-card="${id}"]`);
const cardsOf = (page: Page, id: string) => page.locator(`#hero-board [data-lp-cards="${id}"]`);

/** Presses `from`, moves to the bottom of `to` and holds there; returns the release. */
async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("not on screen");
  await page.mouse.move(a.x + 20, a.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 6, { steps: 12 });
  return () => page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto(HOME);
});

test("moves a card by pointer and by keyboard, in the skin's look", async ({ page }) => {
  const release = await dragTo(page, card(page, "a"), cardsOf(page, "done"));
  // The engine's Clone and Placeholder take the skin's styles (DEC-07).
  const placeholder = page.locator("#hero-board [data-lp-placeholder]");
  await expect(placeholder).toHaveCSS("background-color", "rgb(212, 219, 227)");
  await expect(page.locator("#hero-board [data-lp-clone]")).not.toHaveCSS("box-shadow", "none");
  await release();
  await expect.poll(() => lists(page)).toMatchObject({ todo: ["b", "c"], done: ["f", "a"] });
  await card(page, "b").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  expect(await lists(page)).toMatchObject({ todo: ["c"], doing: ["b", "d", "e"] });
});

test("Doing takes no fourth card, by pointer or by keyboard", async ({ page }) => {
  const count = page.locator('#hero-board [data-lp-list="doing"] .hb-count');
  await expect(count).toHaveText("2/3");
  await (await dragTo(page, card(page, "a"), cardsOf(page, "doing")))();
  await expect(count).toHaveText("3/3");
  await (await dragTo(page, card(page, "b"), cardsOf(page, "doing")))();
  await page.waitForTimeout(100);
  // Refused: b lands at the last allowed place it passed, in To do.
  const full = await lists(page);
  expect([...(full.doing ?? [])].sort()).toEqual(["a", "d", "e"]);
  expect(full.todo).toContain("b");
  // The arrow skips the full Doing, to Done.
  await card(page, "b").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  expect((await lists(page)).done).toContain("b");
  await expect(count).toHaveText("3/3");
});
