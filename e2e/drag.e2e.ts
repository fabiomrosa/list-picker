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
  // The board sits below the title and "Edit the board": bring it into view, as a user would.
  await page.locator("#board").scrollIntoViewIfNeeded();
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

test("moves a card with the keyboard: down, to the next list, back with Esc", async ({ page }) => {
  const design = card(page, "Design the model");
  await design.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(design).toBeFocused();
  expect(await lists(page)).toMatchObject({
    "To do": ["Write the tests"],
    Doing: ["Linked list", "Design the model"],
  });
  await page.keyboard.press("Escape");
  await expect(design).toBeFocused();
  expect(await lists(page)).toMatchObject({ "To do": ["Design the model", "Write the tests"] });
});

test("renames a list and a card; a picked-up card keeps its pick up when redrawn", async ({
  page,
}) => {
  // A click on a list's title edits it in place; Enter saves (Esc would cancel).
  await page.locator('[data-lp-list="To do"] h2').click();
  await page.getByLabel("Name of list To do").fill("Now");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-lp-list="To do"] h2')).toHaveText("Now");
  await expect(page.locator('[data-lp-list="To do"] [data-lp-list-handle]')).toBeFocused();
  // Esc cancels, and the keyboard stays on the header.
  await page.locator('[data-lp-list="Done"] h2').click();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-lp-list="Done"] h2')).toHaveText("Done");
  await expect(page.locator('[data-lp-list="Done"] [data-lp-list-handle]')).toBeFocused();
  // A card's dialog changes its name.
  await card(page, "Write the tests").locator("strong").click();
  await page.locator("#opened input").fill("Tests");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(card(page, "Write the tests").locator("strong")).toHaveText("Tests");
  const design = card(page, "Design the model");
  await design.focus();
  await page.keyboard.press("Space");
  await page.evaluate(() => {
    const { board } = window as unknown as { board: { updateCard(card: object): void } };
    board.updateCard({ id: "Design the model", name: "Model" });
  });
  await expect(design.locator("strong")).toHaveText("Model");
  await expect(design).toBeFocused();
  await expect(design).toHaveAttribute("data-lp-grabbed", "");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  expect(await lists(page)).toMatchObject({ "To do": ["Write the tests", "Design the model"] });
});

test("a click or Enter opens a card; the click ending a drag opens nothing", async ({ page }) => {
  const dialog = page.locator("#opened");
  await card(page, "Design the model").locator("strong").click();
  await expect(dialog).toContainText("Opened card Design the model");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await card(page, "Linked list").focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toContainText("Opened card Linked list");
  await page.keyboard.press("Escape");
  // A drag that ends back in place, released on the card (Chrome fires no click after a drag; the
  // engine swallows one for browsers that do, tested in happy-dom).
  const box = await card(page, "Write the tests").locator("strong").boundingBox();
  if (!box) throw new Error("no card");
  await page.mouse.move(box.x + 10, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 5, { steps: 6 });
  await page.mouse.move(box.x + 10, box.y + 5, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  await expect(dialog).toBeHidden();
  await drag(page, card(page, "Write the tests"), card(page, "Linked list"), 0.1);
  await expect.poll(() => lists(page)).toMatchObject({ Doing: ["Write the tests", "Linked list"] });
  await expect(dialog).toBeHidden();
});

test("a full list (Doing takes at most 3 cards) refuses another card", async ({ page }) => {
  await page.evaluate(() => {
    const { board } = window as unknown as {
      board: { addCard(list: string, card: object, before: null): void };
    };
    board.addCard("Doing", { id: "Second" }, null);
    board.addCard("Doing", { id: "Third" }, null);
  });
  await drag(page, card(page, "Write the tests"), card(page, "Linked list"), 0.1);
  await page.waitForTimeout(100);
  expect(await lists(page)).toMatchObject({
    "To do": ["Design the model", "Write the tests"],
    Doing: ["Linked list", "Second", "Third"],
  });
  await drag(page, card(page, "Third"), card(page, "Linked list"), 0.1);
  await expect.poll(() => lists(page)).toMatchObject({ Doing: ["Third", "Linked list", "Second"] });
});

test("drags a card to another list, before its card", async ({ page }) => {
  await drag(page, card(page, "Write the tests"), card(page, "Linked list"), 0.1);
  await expect
    .poll(() => lists(page))
    .toMatchObject({ "To do": ["Design the model"], Doing: ["Write the tests", "Linked list"] });
});

test("drops a card below a short list, in its column, at its end", async ({ page }) => {
  const doing = await page.locator('[data-lp-list="Doing"]').boundingBox();
  const from = await card(page, "Write the tests").locator("strong").boundingBox();
  if (!doing || !from) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  // Below Doing's last card and below the list itself: the board's background, in Doing's column.
  await page.mouse.move(doing.x + doing.width / 2, doing.y + doing.height + 40, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => lists(page)).toMatchObject({ Doing: ["Linked list", "Write the tests"] });
});

test("drags a card into an empty list", async ({ page }) => {
  await drag(page, card(page, "Linked list"), cardsOf(page, "Done"));
  await expect.poll(() => lists(page)).toMatchObject({ Doing: [], Done: ["Linked list"] });
  // The event log reads each move: what moved, from where to where.
  const event = page.locator("#log li").first();
  await expect(event.locator(".event-id")).toHaveText("Linked list");
  await expect(event.locator(".event-fields")).toContainText("Doing");
  // Beside it, the event as emitted: valid JSON, equal to what `board.on("move")` received.
  const json = JSON.parse((await event.locator(".event-json").textContent()) ?? "");
  expect(json).toEqual({
    kind: "card",
    id: "Linked list",
    fromListId: "Doing",
    toListId: "Done",
    prevId: null,
    nextId: null,
  });
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
  // A window narrower than the lists: the board scrolls sideways, and the drop is hit-tested in it.
  await page.setViewportSize({ width: 900, height: 720 });
  await page.locator("#board").scrollIntoViewIfNeeded();
  const backlog = cardsOf(page, "Backlog");
  // Bring Backlog into view first, as a user would.
  await page.locator("#board").evaluate((board) => {
    board.scrollLeft = board.scrollWidth;
  });
  const box = await backlog.boundingBox();
  const from = await card(page, "Linked list").locator("strong").boundingBox();
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
  await expect.poll(async () => (await lists(page)).Backlog?.at(-1)).toBe("Linked list");
});

test("auto-scrolls a tall list upward, steadily, to drop a card at its top", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.locator("#board").scrollIntoViewIfNeeded();
  const backlog = cardsOf(page, "Backlog");
  await page.locator("#board").evaluate((board) => {
    board.scrollLeft = board.scrollWidth;
  });
  await backlog.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const box = await backlog.boundingBox();
  const from = await card(page, "Idea 14").locator("strong").boundingBox();
  if (!box || !from) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  // Record the list's scroll offset every frame while the pointer rests near its top edge.
  await backlog.evaluate((el) => {
    const offsets: number[] = [];
    (window as unknown as { offsets: number[] }).offsets = offsets;
    const record = () => {
      offsets.push(el.scrollTop);
      if (el.scrollTop > 0) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.mouse.move(box.x + box.width / 2, box.y + 8, { steps: 4 });
  await expect.poll(() => backlog.evaluate((el) => el.scrollTop)).toBe(0);
  const offsets = await page.evaluate(() => (window as unknown as { offsets: number[] }).offsets);
  // Never pushed back down (scroll anchoring once did that every few frames).
  expect(offsets.every((top, i) => i === 0 || top <= (offsets[i - 1] as number))).toBe(true);
  await page.mouse.move(box.x + box.width / 2, box.y + 6);
  await page.mouse.up();
  await expect.poll(async () => (await lists(page)).Backlog?.[0]).toBe("Idea 14");
});

test("drags a list by its title to after the next list", async ({ page }) => {
  const order = () =>
    page
      .locator("[data-lp-list]")
      .evaluateAll((all) => all.map((l) => l.getAttribute("data-lp-list")));
  expect(await order()).toEqual(["To do", "Doing", "Done", "Backlog"]);
  const from = await page.locator('[data-lp-list="To do"] [data-lp-list-handle]').boundingBox();
  const doing = await page.locator('[data-lp-list="Doing"]').boundingBox();
  if (!from || !doing) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(doing.x + doing.width * 0.8, from.y + 5, { steps: 12 });
  await page.mouse.up();
  await expect.poll(order).toEqual(["Doing", "To do", "Done", "Backlog"]);
  // The cards travelled with their list.
  await expect
    .poll(async () => (await lists(page))["To do"])
    .toEqual(["Design the model", "Write the tests"]);
});

test("moves a list with the keyboard by its title, then back with Esc", async ({ page }) => {
  const order = () =>
    page
      .locator("[data-lp-list]")
      .evaluateAll((all) => all.map((l) => l.getAttribute("data-lp-list")));
  const handle = page.locator('[data-lp-list="To do"] [data-lp-list-handle]');
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(handle).toBeFocused();
  expect(await order()).toEqual(["Doing", "Done", "To do", "Backlog"]);
  expect((await lists(page))["To do"]).toEqual(["Design the model", "Write the tests"]);
  await page.keyboard.press("Escape");
  await expect(handle).toBeFocused();
  expect(await order()).toEqual(["To do", "Doing", "Done", "Backlog"]);
});

test("the Placeholder takes the width of the list it is in, scrollbar or not", async ({ page }) => {
  const backlogCard = await card(page, "Idea 1").boundingBox();
  const todoCard = await card(page, "Design the model").boundingBox();
  const from = await card(page, "Design the model").locator("strong").boundingBox();
  const backlog = await cardsOf(page, "Backlog").boundingBox();
  if (!backlogCard || !todoCard || !from || !backlog) throw new Error("not visible");
  // The scrolling Backlog list is narrower inside than To do.
  expect(backlogCard.width).toBeLessThan(todoCard.width);
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(backlog.x + backlog.width / 2, backlog.y + 60, { steps: 12 });
  const placeholder = page.locator('[data-lp-cards="Backlog"] [data-lp-placeholder]');
  await expect(placeholder).toHaveCount(1);
  expect((await placeholder.boundingBox())?.width).toBeCloseTo(backlogCard.width, 0);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("the demo's board in three skins: the same elements, a move kept", async ({ page }) => {
  const board = page.locator("#board");
  // A mark on an element `mount` drew: still there after a skin change means no redraw.
  await card(page, "Design the model").evaluate((el) => el.setAttribute("data-mark", ""));
  await card(page, "Design the model").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  const order = await lists(page);
  for (const skin of ["terminal", "pop", "cards"]) {
    await page.locator(`label[for=skin-${skin}]`).click();
    await expect(board).toHaveAttribute("data-skin", skin);
    expect(await lists(page)).toEqual(order);
    await expect(card(page, "Design the model")).toHaveAttribute("data-mark", "");
  }
  // A touch drag needs `touch-action: none` on what is dragged, in every skin (GOTCHAS).
  await expect(card(page, "Linked list")).toHaveCSS("touch-action", "none");
  await expect(page.locator('[data-lp-list="Doing"] [data-lp-list-handle]')).toHaveCSS(
    "touch-action",
    "none",
  );
  // Each skin styles the demo's cards: Terminal's are black, Pop's have a thick border.
  await page.locator("label[for=skin-terminal]").click();
  await expect(card(page, "Linked list")).toHaveCSS("background-color", "rgb(13, 15, 13)");
  await page.locator("label[for=skin-pop]").click();
  await expect(card(page, "Linked list")).toHaveCSS("border-top-width", "2px");
});

test("a tilted Clone (Pop's rotate) stays under the pointer on a long drag", async ({ page }) => {
  await page.locator("label[for=skin-pop]").click();
  const from = await card(page, "Design the model").boundingBox();
  if (!from) throw new Error("not visible");
  await page.mouse.move(from.x + 20, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 520, from.y + 260, { steps: 20 });
  const clone = page.locator("[data-lp-clone]");
  await expect
    .poll(async () => {
      const box = await clone.boundingBox();
      if (!box) return Number.POSITIVE_INFINITY;
      const dx = box.x + box.width / 2 - (from.x + from.width / 2 + 500);
      const dy = box.y + box.height / 2 - (from.y + from.height / 2 + 250);
      return Math.hypot(dx, dy);
    })
    .toBeLessThan(3);
  await page.mouse.up();
});

test("the Clone has no transition or animation: it follows the pointer frame by frame", async ({
  page,
}) => {
  const from = await card(page, "Design the model").locator("strong").boundingBox();
  if (!from) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(from.x + 60, from.y + 80, { steps: 6 });
  const clone = page.locator("[data-lp-clone]");
  await expect(clone).toHaveCount(1);
  const moving = await clone.evaluate((el) => {
    const all = [el, ...el.querySelectorAll("*")];
    return all
      .filter(
        (e) =>
          getComputedStyle(e)
            .transitionDuration.split(",")
            .some((d) => Number.parseFloat(d) > 0) || e.getAnimations().length > 0,
      )
      .map(
        (e) =>
          `${e.tagName}.${e.className} ${getComputedStyle(e).transitionProperty} ${getComputedStyle(e).transitionDuration}`,
      );
  });
  await page.mouse.up();
  expect(moving).toEqual([]);
});

/** Board lists and DOM lists agree: card ids per list, in order. */
async function boardMatchesPage(page: Page): Promise<void> {
  const fromBoard = await page.evaluate(() => {
    const w = window as unknown as {
      board: { lists(): Iterable<{ id: string }>; cards(id: string): Iterable<{ id: string }> };
    };
    return Object.fromEntries(
      [...w.board.lists()].map((list) => [list.id, [...w.board.cards(list.id)].map((c) => c.id)]),
    );
  });
  await expect.poll(() => lists(page)).toEqual(fromBoard);
}

test("removing another card with the demo's × during a drag leaves the page and the Board in step", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await dragWhile(page, async () => {
    // The × by keyboard: the pointer is busy dragging.
    await page.getByRole("button", { name: "remove card Write the tests" }).press("Enter");
  });
  await expect(card(page, "Write the tests")).toHaveCount(0);
  await expect(cardsOf(page, "Doing").locator('[data-lp-card="Design the model"]')).toHaveCount(1);
  await boardMatchesPage(page);
  expect(errors).toEqual([]);
});

/** Drags "Design the model" to the end of Doing, running `during` once the Clone is up. */
async function dragWhile(page: Page, during: () => Promise<void>): Promise<void> {
  const from = await card(page, "Design the model").locator("strong").boundingBox();
  const to = await cardsOf(page, "Doing").boundingBox();
  if (!from || !to) throw new Error("not visible");
  await page.mouse.move(from.x + 10, from.y + 5);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 40, { steps: 6 });
  await expect(page.locator("[data-lp-clone]")).toHaveCount(1);
  await during();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 5, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("[data-lp-clone], [data-lp-placeholder]")).toHaveCount(0);
}
