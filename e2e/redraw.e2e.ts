import { expect, type Page, test } from "@playwright/test";

// `moveElements: false` (DEC-18, L5.2): a renderer redraws the board from the Snapshot with new
// elements on each change. In Chrome, a redraw blurs the focused card; the pick-up must survive it.
const order = (page: Page) =>
  page.evaluate(() => {
    const board = (
      window as unknown as {
        board: { snapshot(): { lists: { list: { id: string }; cards: { id: string }[] }[] } };
      }
    ).board;
    return board.snapshot().lists.map(({ cards }) => cards.map((card) => card.id));
  });
const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return { id: el?.getAttribute("data-lp-card"), grabbed: el?.hasAttribute("data-lp-grabbed") };
  });
const said = (page: Page) => page.locator('[aria-live="assertive"]').textContent();

for (const redraw of ["sync", "microtask"]) {
  test.describe(`a renderer redrawing in ${redraw}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/redraw.html?redraw=${redraw}`);
      await page.locator('[data-lp-card="a"]').focus();
      await page.keyboard.press("Space");
    });

    test("several steps within and across lists keep the pick-up and the focus", async ({
      page,
    }) => {
      for (const [key, expected] of [
        ["ArrowDown", [["b", "a", "c"], ["d"], []]],
        ["ArrowRight", [["b", "c"], ["d", "a"], []]],
        ["ArrowRight", [["b", "c"], ["d"], ["a"]]],
        ["ArrowLeft", [["b", "c"], ["a", "d"], []]], // the same position: first
        ["ArrowDown", [["b", "c"], ["d", "a"], []]],
      ] as const) {
        const before = await said(page);
        await page.keyboard.press(key);
        await expect.poll(() => order(page)).toEqual(expected);
        await expect.poll(() => focused(page)).toEqual({ id: "a", grabbed: true });
        await expect.poll(() => said(page)).not.toBe(before); // each step announced
      }
      await page.keyboard.press("Space");
      await expect.poll(() => focused(page)).toEqual({ id: "a", grabbed: false });
    });

    test("Esc puts the Board back where the card was picked up", async ({ page }) => {
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => focused(page)).toEqual({ id: "a", grabbed: true });
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => order(page)).toEqual([["b", "c"], ["d"], ["a"]]);
      await page.keyboard.press("Escape");
      await expect.poll(() => order(page)).toEqual([["a", "b", "c"], ["d"], []]);
      await expect(page.locator("[data-lp-grabbed]")).toHaveCount(0);
      // The focus stays on the card, back in its place, as in the default mode.
      await expect.poll(() => focused(page)).toEqual({ id: "a", grabbed: false });
    });

    test("the focus really leaving drops the card", async ({ page }) => {
      await page.locator("#elsewhere").focus();
      await expect(page.locator("[data-lp-grabbed]")).toHaveCount(0);
      await page.keyboard.press("ArrowDown");
      expect(await order(page)).toEqual([["a", "b", "c"], ["d"], []]);
    });
  });
}

test("after a step, a click on the page away from the board drops the card there", async ({
  page,
}) => {
  await page.goto("/redraw.html?redraw=microtask");
  await page.locator('[data-lp-card="a"]').focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => focused(page)).toEqual({ id: "a", grabbed: true });
  await page.mouse.click(700, 500); // blank page: the focus goes to body
  await expect(page.locator("[data-lp-grabbed]")).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});
