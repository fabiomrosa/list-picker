import { expect, type Page, test } from "@playwright/test";

// The Board demo, the same tests for each page that draws it: in vanilla (L5.12), drawn by `mount`;
// in React (L5.6), drawn from the Snapshot under StrictMode, the engine attached by
// `useListPicker` (DEC-18).
const PAGES = [
  ["vanilla", "http://localhost:5181/list-picker/board.html"],
  ["react", "http://localhost:5181/list-picker/react-demo.html"],
] as const;
const lists = (page: Page) =>
  page
    .locator("#hero-board [data-lp-cards]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((list) => [
          list.getAttribute("data-lp-cards"),
          [...list.querySelectorAll("[data-lp-card]")].map((card) =>
            card.getAttribute("data-lp-card"),
          ),
        ]),
      ),
    );
const card = (page: Page, id: string) => page.locator(`[data-lp-card="${id}"]`);

for (const [name, DEMO] of PAGES) {
  test.describe(name, () => {
    let errors: string[] = [];
    test.beforeEach(async ({ page }) => {
      errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(DEMO);
      await expect(card(page, "a")).toBeVisible();
    });
    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test("a card dragged to another list lands there", async ({ page }) => {
      const from = await card(page, "a").boundingBox();
      const to = await page.locator('[data-lp-cards="done"]').boundingBox();
      if (!from || !to) throw new Error("not visible");
      await page.mouse.move(from.x + 20, from.y + 10);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height - 5, { steps: 12 });
      await page.mouse.up();
      await expect.poll(() => lists(page)).toMatchObject({ todo: ["b", "c"], done: ["f", "a"] });
      await expect(page.locator("[data-lp-clone], [data-lp-placeholder]")).toHaveCount(0);
    });

    test("a card moved with the keyboard keeps its focus; Doing refuses a fourth", async ({
      page,
    }) => {
      await card(page, "a").focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight"); // to Doing, at the same position (first): 3 cards now
      await expect.poll(() => lists(page)).toMatchObject({ doing: ["a", "d", "e"] });
      await expect(card(page, "a")).toBeFocused();
      await page.keyboard.press("Space");
      await card(page, "b").focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight"); // Doing is full: on to Done, first
      await expect
        .poll(() => lists(page))
        .toMatchObject({ doing: ["a", "d", "e"], done: ["b", "f"] });
      await expect(page.locator(".hb-count").nth(1)).toHaveText("3/3");
    });

    test("one live region (React: under StrictMode); Enter on a card opens it", async ({
      page,
    }) => {
      await expect(page.locator("[aria-live]")).toHaveCount(1);
      await card(page, "c").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toHaveText("Opened: Fix the date picker on Safari.");
    });
  });
}
