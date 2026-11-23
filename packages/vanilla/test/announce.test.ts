// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../core/src/index.ts";
import { createDrag } from "../src/index.ts";

type Entity = { id: string };

function key(target: Element, name: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
  );
}

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }),
  );
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

describe("createDrag: live announcements", () => {
  let root: HTMLElement;
  let board: Board<Entity, Entity>;
  let drag: ReturnType<typeof createDrag> | undefined;
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <section data-lp-list="todo"><h2 data-lp-list-handle tabindex="0">To do</h2>
          <ul data-lp-cards="todo">
            <li data-lp-card="a" tabindex="0" aria-label="Card A">A <button type="button">×</button></li>
            <li data-lp-card="b" tabindex="0">B</li>
          </ul></section>
        <section data-lp-list="done"><h2 data-lp-list-handle tabindex="0">Done</h2>
          <ul data-lp-cards="done"></ul></section>
      </div>`;
    board = new Board<Entity, Entity>();
    board.addList({ id: "todo" }, null);
    board.addList({ id: "done" }, null);
    board.addCard("todo", { id: "a" }, null);
    board.addCard("todo", { id: "b" }, null);
    root = document.getElementById("root") as HTMLElement;
    drag = undefined;
  });
  afterEach(() => drag?.destroy());

  const region = () => root.querySelector("[aria-live]");
  const said = () => region()?.textContent;
  const card = (id: string) => root.querySelector(`[data-lp-card="${id}"]`) as HTMLElement;
  /** Focuses `target` and presses `keys` on whatever holds the focus. */
  function press(target: HTMLElement, ...keys: string[]) {
    target.focus();
    for (const name of keys) key(document.activeElement as Element, name);
  }

  it("announces a keyboard pick up, each move, the drop and a cancel, in its live region", () => {
    drag = createDrag(root, board);
    expect(region()?.getAttribute("aria-live")).toBe("assertive");
    expect(said()).toBe("");
    press(card("a"), " ");
    expect(said()).toBe("Picked up Card A. To do, position 1 of 2.");
    press(card("a"), "ArrowDown");
    expect(said()).toBe("Moved Card A. To do, position 2 of 2.");
    press(card("a"), "ArrowRight");
    expect(said()).toBe("Moved Card A. Done, position 1 of 1.");
    press(card("a"), " ");
    expect(said()).toBe("Dropped Card A. Done, position 1 of 1.");
    press(card("b"), "Enter", "ArrowRight", "Escape");
    expect(said()).toBe("Cancelled moving B. To do, position 1 of 1.");
  });

  it("announces a list by its handle's label, among the lists", () => {
    drag = createDrag(root, board);
    const handle = root.querySelector("[data-lp-list-handle]") as HTMLElement;
    press(handle, " ");
    expect(said()).toBe("Picked up To do. Position 1 of 2.");
    press(handle, "ArrowRight");
    expect(said()).toBe("Moved To do. Position 2 of 2.");
  });

  it("replaces a default message with the `messages` option, keeping the others", () => {
    drag = createDrag(root, board, {
      messages: {
        move: ({ label, list, position, count }) => `${label} in ${list}: ${position}/${count}`,
      },
    });
    press(card("a"), " ");
    expect(said()).toBe("Picked up Card A. To do, position 1 of 2.");
    press(card("a"), "ArrowDown");
    expect(said()).toBe("Card A in To do: 2/2");
  });

  it("announces a pointer drag's pick up, drop and cancel, not each pointer move", async () => {
    drag = createDrag(root, board);
    card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => null;
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointermove", 70, 30);
    expect(said()).toBe("Picked up Card A. To do, position 1 of 2.");
    pointer(card("a"), "pointermove", 90, 60);
    await frame();
    expect(said()).toBe("Picked up Card A. To do, position 1 of 2.");
    pointer(card("a"), "pointerup", 90, 60);
    expect(said()).toBe("Dropped Card A. To do, position 1 of 2.");
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointermove", 70, 30);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(said()).toBe("Cancelled moving Card A. To do, position 1 of 2.");
  });

  it("announces no move on Esc without one, and a keyboard step a throwing listener follows", () => {
    let moves = 0;
    const move = () => `moved ${++moves}`;
    drag = createDrag(root, board, { messages: { move } });
    press(card("a"), " ", "Escape");
    expect(moves).toBe(0);
    expect(region()?.textContent).toBe("Cancelled moving Card A. To do, position 1 of 2.");
    board.on("move", () => {
      throw new Error("listener failed");
    });
    card("a").focus();
    key(card("a"), " ");
    expect(() => key(card("a"), "ArrowDown")).toThrow("listener failed");
    expect(region()?.textContent).toBe("moved 1");
  });

  it("keeps Esc and the focus leaving working when a pick up message throws", () => {
    drag = createDrag(root, board, {
      messages: {
        pickUp: () => {
          throw new Error("boom");
        },
      },
    });
    card("a").focus();
    expect(() => key(card("a"), " ")).toThrow("boom");
    (root.querySelector("[data-lp-list-handle]") as HTMLElement).focus();
    expect(card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    pointer(card("a"), "pointerdown", 50, 30);
    expect(() => pointer(card("a"), "pointermove", 70, 30)).toThrow("boom");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("removes its live region on destroy", () => {
    drag = createDrag(root, board);
    drag.destroy();
    expect(region()).toBeNull();
  });
});
