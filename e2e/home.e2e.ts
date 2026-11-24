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
  // Below the hero, the board may start under the fold (CI's fonts are larger): bring it into
  // view, since the engine finds the drop target at the pointer.
  await page.locator("#hero-board").scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error("not on screen");
  await page.mouse.move(a.x + 20, a.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height - 6, { steps: 12 });
  // One frame for the Placeholder to reach the last place before the release.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
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
  const clone = page.locator("#hero-board [data-lp-clone]");
  await expect(clone).toHaveCSS("box-shadow", "rgba(9, 30, 66, 0.3) 0px 10px 24px 0px");
  await expect(clone).toHaveCSS("rotate", "2deg");
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

test("a dragged list keeps the skin's look", async ({ page }) => {
  const title = page.locator('#hero-board [data-lp-list="todo"] [data-lp-list-handle]');
  const release = await dragTo(page, title, page.locator('#hero-board [data-lp-list="done"]'));
  // The engine takes `data-lp-list` off the Clone: the skin styles it by what it holds.
  await expect(page.locator("#hero-board [data-lp-clone]")).toHaveCSS(
    "background-color",
    "rgb(241, 244, 247)",
  );
  await release();
});

test("three skins restyle the same board, without redrawing it", async ({ page }) => {
  const board = page.locator("#hero-board");
  // A mark on an element `mount` drew: still there after a skin change means no redraw.
  await card(page, "a").evaluate((el) => el.setAttribute("data-mark", ""));
  await (await dragTo(page, card(page, "a"), cardsOf(page, "done")))();
  const order = await lists(page);
  for (const [skin, listBorder, placeholderBorder] of [
    ["terminal", "1px dashed rgb(47, 74, 44)", "1px dashed rgb(95, 143, 89)"],
    ["pop", "3px solid rgb(17, 17, 17)", "2px dashed rgb(17, 17, 17)"],
  ] as const) {
    await page.locator(`label[for=skin-${skin}]`).click();
    await expect(board).toHaveAttribute("data-skin", skin);
    expect(await lists(page)).toEqual(order);
    await expect(card(page, "a")).toHaveAttribute("data-mark", "");
    // A list's Clone, too, takes the skin's look.
    const title = page.locator('#hero-board [data-lp-list="todo"] [data-lp-list-handle]');
    const release = await dragTo(page, title, page.locator('#hero-board [data-lp-list="todo"]'));
    await expect(page.locator("#hero-board [data-lp-clone]")).toHaveCSS("border-top", listBorder);
    await expect(page.locator("#hero-board [data-lp-placeholder]")).toHaveCSS(
      "border-top",
      placeholderBorder,
    );
    await page.keyboard.press("Escape");
    await release();
  }
});

test("Terminal: a list picked up by keyboard keeps its cards readable", async ({ page }) => {
  await page.locator("label[for=skin-terminal]").click();
  await page.locator('#hero-board [data-lp-list="todo"] [data-lp-list-handle]').focus();
  await page.keyboard.press("Space");
  const text = card(page, "a").locator("p");
  const color = await text.evaluate((el) => getComputedStyle(el).color);
  const background = await card(page, "a").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(color).not.toBe(background);
});

test("Pop: a list drag keeps the other lists' colours; the skin label is only text", async ({
  page,
}) => {
  await page.locator(".skins span").click({ position: { x: 4, y: 6 } });
  await expect(page.locator("#hero-board")).toHaveAttribute("data-skin", "cards");
  await page.locator("label[for=skin-pop]").click();
  const doing = page.locator('#hero-board [data-lp-list="doing"]');
  const before = await doing.evaluate((el) => getComputedStyle(el).backgroundColor);
  const title = page.locator('#hero-board [data-lp-list="todo"] [data-lp-list-handle]');
  const release = await dragTo(page, title, page.locator('#hero-board [data-lp-list="todo"]'));
  await expect(page.locator("#hero-board [data-lp-placeholder]")).toBeVisible();
  await expect(doing).toHaveCSS("background-color", before);
  await page.keyboard.press("Escape");
  await release();
});

test("no page scrolls sideways on a 320px phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["", "core.html", "vanilla.html", "player.html"]) {
    await page.goto(`http://localhost:5181/list-picker/${path}`);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path || "home").toBeLessThanOrEqual(320);
  }
});
