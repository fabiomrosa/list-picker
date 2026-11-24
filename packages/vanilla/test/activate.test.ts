// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../core/src/index.ts";
import { createDrag } from "../src/index.ts";

type Entity = { id: string };

function key(target: Element, name: string, repeat = false) {
  const event = new KeyboardEvent("keydown", {
    key: name,
    repeat,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }),
  );
}

/** A click as a pointer makes it (`detail` 1); a keyboard's click has `detail` 0. */
const click = (target: Element) =>
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));

describe("createDrag: activating a card or a list", () => {
  let root: HTMLElement;
  let board: Board<Entity, Entity>;
  let drag: ReturnType<typeof createDrag> | undefined;
  let activated: { kind: string; id: string }[];
  const elementFromPoint = document.elementFromPoint;
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <section data-lp-list="todo"><h2 data-lp-list-handle tabindex="0">To do</h2>
          <ul data-lp-cards="todo">
            <li data-lp-card="a" tabindex="0">A <button type="button">×</button></li>
            <li data-lp-card="b" tabindex="0">B</li>
          </ul></section>
      </div>`;
    board = new Board<Entity, Entity>();
    board.addList({ id: "todo" }, null);
    board.addCard("todo", { id: "a" }, null);
    board.addCard("todo", { id: "b" }, null);
    root = document.getElementById("root") as HTMLElement;
    activated = [];
    drag = createDrag(root, board, { onActivate: (item) => activated.push({ ...item }) });
  });
  afterEach(() => {
    drag?.destroy();
    document.elementFromPoint = elementFromPoint;
  });

  const card = (id: string) => root.querySelector(`[data-lp-card="${id}"]`) as HTMLElement;
  const handle = () => root.querySelector("[data-lp-list-handle]") as HTMLElement;

  it("activates on a click on a card or a list's handle, not on a control or elsewhere", () => {
    click(card("a"));
    click(handle());
    click(card("a").querySelector("button") as HTMLElement);
    click(root.querySelector("[data-lp-cards]") as HTMLElement);
    expect(activated).toEqual([
      { kind: "card", id: "a" },
      { kind: "list", id: "todo" },
    ]);
  });

  it("lets the click that ends a drag reach neither the card nor the page", () => {
    const own: string[] = [];
    card("a").addEventListener("click", () => own.push("card"));
    document.addEventListener("click", () => own.push("page"));
    card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => null;
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointermove", 80, 30);
    pointer(card("a"), "pointerup", 80, 30);
    click(card("a"));
    expect(activated).toEqual([]);
    expect(own).toEqual([]);
    // The next press and click are ordinary again.
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointerup", 50, 30);
    click(card("a"));
    expect(activated).toEqual([{ kind: "card", id: "a" }]);
    expect(own).toEqual(["card", "page"]);
  });

  it("swallows no click after a drag whose next press a control keeps from `root`", () => {
    card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => null;
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointermove", 80, 30);
    pointer(card("a"), "pointerup", 80, 30);
    const button = card("b").appendChild(document.createElement("span"));
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    const clicks: string[] = [];
    button.addEventListener("click", () => clicks.push("control"));
    pointer(button, "pointerdown", 50, 120);
    click(button);
    expect(clicks).toEqual(["control"]);
  });

  it("activates nothing on Enter during a pointer press", () => {
    card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    pointer(card("a"), "pointerdown", 50, 30);
    card("a").focus();
    key(card("a"), "Enter");
    pointer(card("a"), "pointerup", 50, 30);
    expect(activated).toEqual([]);
  });

  it("activates on Enter on a focused card or handle; Space still picks up", () => {
    card("a").focus();
    expect(key(card("a"), "Enter").defaultPrevented).toBe(true);
    key(card("a"), "Enter", true);
    handle().focus();
    key(handle(), "Enter");
    const button = card("a").querySelector("button") as HTMLElement;
    button.focus();
    expect(key(button, "Enter").defaultPrevented).toBe(false);
    expect(activated).toEqual([
      { kind: "card", id: "a" },
      { kind: "list", id: "todo" },
    ]);
    card("a").focus();
    key(card("a"), " ");
    expect(card("a").hasAttribute("data-lp-grabbed")).toBe(true);
    key(card("a"), "Enter");
    expect(card("a").hasAttribute("data-lp-grabbed")).toBe(true);
    expect(activated).toHaveLength(2);
  });

  it("without `onActivate`, leaves Enter and clicks alone", () => {
    drag?.destroy();
    drag = createDrag(root, board);
    card("a").focus();
    expect(key(card("a"), "Enter").defaultPrevented).toBe(false);
    expect(card("a").hasAttribute("data-lp-grabbed")).toBe(false);
  });

  it("activates nothing after destroy", () => {
    drag?.destroy();
    drag = undefined;
    click(card("a"));
    card("a").focus();
    key(card("a"), "Enter");
    expect(activated).toEqual([]);
  });
});
