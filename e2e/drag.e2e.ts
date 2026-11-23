import { expect, type Locator, type Page, test } from "@playwright/test";

/** Card ids per list, in DOM order. */
async function lists(page: Page): Promise<Record<string, string[]>> {
  return page
    .locator("[data-lp-cards]")
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
}

/** Drags `card` by its title to a point inside `target` (fraction of its height), in small steps. */
async function drag(page: Page, card: Locator, target: Locator, at = 0.5): Promise<void> {
  const from = await card.locator("strong").boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * at, { steps: 12 });
  await page.mouse.up();
}

const card = (page: Page, id: string) => page.locator(`[data-lp-card="${id}"]`);
const cardsOf = (page: Page, id: string) => page.locator(`[data-lp-cards="${id}"]`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  expect(await lists(page)).toMatchObject({
    "To do": ["Design the model", "Write the tests"],
    Doing: ["Linked list"],
    Done: [],
  });
});

test("drags a card below another in the same list", async ({ page }) => {
  await drag(page, card(page, "Design the model"), card(page, "Write the tests"), 0.9);
  await expect
    .poll(() => lists(page))
    .toMatchObject({ "To do": ["Write the tests", "Design the model"] });
});

test("drags a card to another list, before its card", async ({ page }) => {
  await drag(page, card(page, "Write the tests"), card(page, "Linked list"), 0.1);
  await expect
    .poll(() => lists(page))
    .toMatchObject({ "To do": ["Design the model"], Doing: ["Write the tests", "Linked list"] });
});

test("drags a card into an empty list", async ({ page }) => {
  await drag(page, card(page, "Linked list"), cardsOf(page, "Done"));
  await expect.poll(() => lists(page)).toMatchObject({ Doing: [], Done: ["Linked list"] });
  await expect(page.locator("#log li").first()).toContainText('"toListId":"Done"');
});

test("a click without moving changes nothing", async ({ page }) => {
  await card(page, "Design the model").locator("strong").click();
  expect(await lists(page)).toMatchObject({
    "To do": ["Design the model", "Write the tests"],
    Doing: ["Linked list"],
    Done: [],
  });
  await expect(page.locator("[data-lp-clone], [data-lp-placeholder]")).toHaveCount(0);
  await expect(page.locator("#log li")).toHaveCount(0);
});

test("auto-scrolls a tall list to drop a card at its end", async ({ page }) => {
  const backlog = cardsOf(page, "Backlog");
  const box = await backlog.boundingBox();
  const from = await card(page, "Design the model").locator("strong").boundingBox();
  if (!box || !from) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  // Rest the pointer just inside the list's bottom edge until it has scrolled to the end.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8, { steps: 12 });
  await expect
    .poll(() => backlog.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1))
    .toBe(true);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 6);
  await page.mouse.up();
  await expect.poll(async () => (await lists(page)).Backlog?.at(-1)).toBe("Design the model");
});
