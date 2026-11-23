// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board, type MoveEvent } from "../../core/src/index.ts";
import { createDrag } from "../src/index.ts";

type Entity = { id: string };

/** Three lists in the engine's markup (DEC-13), focusable cards, and the Board behind them. */
function setup() {
  document.body.innerHTML = `
    <div id="root">
      <ul data-lp-cards="todo">
        <li data-lp-card="a" tabindex="0">A <button type="button">×</button></li>
        <li data-lp-card="b" tabindex="0">B</li>
        <li data-lp-card="c" tabindex="0">C</li>
      </ul>
      <ul data-lp-cards="doing"><li data-lp-card="d" tabindex="0">D</li></ul>
      <ul data-lp-cards="done"></ul>
    </div>
    <input id="elsewhere">`;
  const board = new Board<Entity, Entity>();
  for (const id of ["todo", "doing", "done"]) board.addList({ id }, null);
  for (const id of ["a", "b", "c"]) board.addCard("todo", { id }, null);
  board.addCard("doing", { id: "d" }, null);
  const root = document.getElementById("root") as HTMLElement;
  const card = (id: string) => root.querySelector(`[data-lp-card="${id}"]`) as HTMLElement;
  const moves: MoveEvent[] = [];
  board.on("move", (event) => moves.push(event));
  return { root, board, card, moves };
}

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

describe("createDrag: moving a card with the keyboard", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  beforeEach(() => {
    ctx = setup();
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => drag.destroy());

  const boardOrder = () =>
    [...ctx.board.lists()].map((list) => [...ctx.board.cards(list.id)].map((card) => card.id));
  const domOrder = () =>
    [...ctx.root.querySelectorAll("[data-lp-cards]")].map((list) =>
      [...list.querySelectorAll("[data-lp-card]")].map((card) => card.getAttribute("data-lp-card")),
    );

  /** Focuses card `id` and presses `keys` on whatever holds the focus. */
  function press(id: string, ...keys: string[]) {
    ctx.card(id).focus();
    for (const name of keys) key(document.activeElement as Element, name);
  }

  it("picks a card up, moves it down and up, one move event each, and drops it", () => {
    press("a", " ");
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(true);
    key(ctx.card("a"), " ", true); // a held key's repeat does not drop it
    press("a", "ArrowDown", "ArrowDown", " ");
    expect(boardOrder()).toEqual([["b", "c", "a"], ["d"], []]);
    expect(domOrder()).toEqual(boardOrder());
    expect(ctx.moves).toHaveLength(2);
    expect(document.activeElement).toBe(ctx.card("a"));
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    press("a", "ArrowUp");
    expect(ctx.moves).toHaveLength(2);
    // Enter works as Space; nothing moves past the top.
    press("a", "Enter", "ArrowUp", "ArrowUp", "ArrowUp", "Enter");
    expect(boardOrder()).toEqual([["a", "b", "c"], ["d"], []]);
    expect(domOrder()).toEqual(boardOrder());
    expect(ctx.moves).toHaveLength(4);
    expect(document.activeElement).toBe(ctx.card("a"));
  });

  it("moves across lists to the same position or the end, and stops at the first and last", () => {
    press("a", " ", "ArrowLeft", " ");
    expect(ctx.moves).toHaveLength(0);
    press("b", " ", "ArrowRight");
    expect(boardOrder()).toEqual([["a", "c"], ["d", "b"], []]);
    press("b", "ArrowRight", "ArrowRight");
    expect(boardOrder()).toEqual([["a", "c"], ["d"], ["b"]]);
    expect(ctx.moves).toHaveLength(2);
    press("b", "ArrowLeft");
    expect(boardOrder()).toEqual([["a", "c"], ["b", "d"], []]);
    press("b", "ArrowLeft", " ");
    expect(boardOrder()).toEqual([["b", "a", "c"], ["d"], []]);
    expect(domOrder()).toEqual(boardOrder());
    expect(document.activeElement).toBe(ctx.card("b"));
  });

  it("puts the card back where it was picked up on Esc", () => {
    press("b", " ", "ArrowDown", "ArrowRight", "Escape");
    expect(boardOrder()).toEqual([["a", "b", "c"], ["d"], []]);
    expect(domOrder()).toEqual(boardOrder());
    expect(ctx.card("b").hasAttribute("data-lp-grabbed")).toBe(false);
    expect(document.activeElement).toBe(ctx.card("b"));
  });

  it("drops the card where it is when the focus leaves it", () => {
    press("a", " ", "ArrowDown");
    (document.getElementById("elsewhere") as HTMLElement).focus();
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    press("a", "ArrowDown");
    expect(boardOrder()).toEqual([["b", "a", "c"], ["d"], []]);
  });

  it("prevents the page's default (scrolling) only for the keys it handles", () => {
    ctx.card("a").focus();
    expect(key(ctx.card("a"), "ArrowDown").defaultPrevented).toBe(false);
    expect(key(ctx.card("a"), " ").defaultPrevented).toBe(true);
    expect(key(ctx.card("a"), "ArrowDown").defaultPrevented).toBe(true);
  });

  it("ignores keys on the card's controls", () => {
    const button = ctx.card("a").querySelector("button") as HTMLButtonElement;
    button.focus();
    key(button, " ");
    key(button, "ArrowDown");
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    expect(ctx.moves).toHaveLength(0);
  });

  it("never runs with a pointer drag: no pick up during a press; a press drops a picked-up card", () => {
    const pointer = (target: Element, type: string, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }),
      );
    ctx.card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    press("a", " ");
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    pointer(ctx.card("a"), "pointerup", 50, 30);
    press("a", " ");
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    expect(ctx.card("a").hasAttribute("data-lp-grabbed")).toBe(false);
    pointer(ctx.card("a"), "pointermove", 80, 90);
    expect(ctx.root.querySelector("[data-lp-clone]")).not.toBeNull();
    pointer(ctx.card("a"), "pointerup", 80, 90);
  });

  it("listens to no key after destroy", () => {
    drag.destroy();
    press("a", " ", "ArrowDown");
    expect(ctx.moves).toHaveLength(0);
  });
});
