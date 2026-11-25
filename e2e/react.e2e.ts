import { expect, type Page, test } from "@playwright/test";

// The React demo (L5.6): the kanban board drawn by React from the Snapshot, under StrictMode, the
// engine attached by `useListPicker` (DEC-18).
const DEMO = "http://localhost:5181/list-picker/react-demo.html";
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

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(DEMO);
  await expect(card(page, "a")).toBeVisible();
  test.info().annotations.push({ type: "errors", description: "" });
  (page as unknown as { errors: string[] }).errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { errors: string[] }).errors).toEqual([]);
});

test("a card dragged to another list lands there, drawn by React", async ({ page }) => {
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

test("a card moved with the keyboard keeps its focus; Doing refuses a fourth", async ({ page }) => {
  await card(page, "a").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight"); // to Doing, at the same position (first): 3 cards now
  await expect.poll(() => lists(page)).toMatchObject({ doing: ["a", "d", "e"] });
  await expect(card(page, "a")).toBeFocused();
  await page.keyboard.press("Space");
  await card(page, "b").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight"); // Doing is full: on to Done, first
  await expect.poll(() => lists(page)).toMatchObject({ doing: ["a", "d", "e"], done: ["b", "f"] });
  await expect(page.locator(".hb-count").nth(1)).toHaveText("3/3");
});

test("under StrictMode one engine runs; Enter on a card opens it", async ({ page }) => {
  await expect(page.locator("[aria-live]")).toHaveCount(1);
  await card(page, "c").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Opened: Fix the date picker on Safari.");
});
