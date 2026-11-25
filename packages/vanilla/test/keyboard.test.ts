// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    // Enter neither picks up nor drops (it activates, DEC-15); nothing moves past the top.
    press("a", "Enter", "ArrowUp");
    expect(ctx.moves).toHaveLength(2);
    press("a", " ", "ArrowUp", "ArrowUp", "Enter", "ArrowUp", " ");
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

describe("createDrag: moving a list with the keyboard", () => {
  let root: HTMLElement;
  let board: Board<Entity, Entity>;
  let moves: MoveEvent[];
  let drag: ReturnType<typeof createDrag>;
  beforeEach(() => {
    document.body.innerHTML = `<div id="root">${["one", "two", "three"]
      .map(
        (id) => `<section data-lp-list="${id}"><h2 data-lp-list-handle tabindex="0">${id}</h2>
          <ul data-lp-cards="${id}"><li data-lp-card="${id}-card" tabindex="0"></li></ul></section>`,
      )
      .join("")}</div>`;
    board = new Board<Entity, Entity>();
    for (const id of ["one", "two", "three"]) {
      board.addList({ id }, null);
      board.addCard(id, { id: `${id}-card` }, null);
    }
    moves = [];
    board.on("move", (event) => moves.push(event));
    root = document.getElementById("root") as HTMLElement;
    drag = createDrag(root, board);
  });
  afterEach(() => drag.destroy());

  const handle = (id: string) =>
    root.querySelector(`[data-lp-list="${id}"] [data-lp-list-handle]`) as HTMLElement;
  const boardOrder = () => [...board.lists()].map((list) => list.id);
  const domOrder = () =>
    [...root.querySelectorAll("[data-lp-list]")].map((list) => list.getAttribute("data-lp-list"));
  function press(id: string, ...keys: string[]) {
    handle(id).focus();
    for (const name of keys) key(document.activeElement as Element, name);
  }

  it("picks a list up by its handle, moves it one place right with its cards, and drops it", () => {
    press("one", " ");
    expect(handle("one").closest("[data-lp-list]")?.hasAttribute("data-lp-grabbed")).toBe(true);
    press("one", "ArrowRight", " ");
    expect(boardOrder()).toEqual(["two", "one", "three"]);
    expect(domOrder()).toEqual(boardOrder());
    expect(moves).toHaveLength(1);
    expect(root.querySelector('[data-lp-list="one"] [data-lp-card="one-card"]')).not.toBeNull();
    expect(document.activeElement).toBe(handle("one"));
    expect(handle("one").closest("[data-lp-list]")?.hasAttribute("data-lp-grabbed")).toBe(false);
  });

  it("puts a list back on Esc; ↑ ↓ and moves past either end do nothing", () => {
    press("two", " ", "ArrowUp", "ArrowDown");
    expect(moves).toHaveLength(0);
    press("two", "ArrowLeft", "ArrowLeft");
    expect(boardOrder()).toEqual(["two", "one", "three"]);
    press("two", "ArrowRight", "ArrowRight", "ArrowRight", "Escape");
    expect(moves).toHaveLength(4);
    expect(boardOrder()).toEqual(["one", "two", "three"]);
    expect(domOrder()).toEqual(boardOrder());
    expect(document.activeElement).toBe(handle("two"));
  });
});

describe.each(["sync", "microtask"] as const)(
  "createDrag with moveElements: false, keyboard, a renderer redrawing in %s (DEC-18)",
  (when) => {
    let ctx: ReturnType<typeof setup>;
    let drag: ReturnType<typeof createDrag>;
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    const boardOrder = () =>
      [...ctx.board.lists()].map((list) => [...ctx.board.cards(list.id)].map((card) => card.id));
    const grabbed = () => [...ctx.root.querySelectorAll("[data-lp-grabbed]")].map((el) => el.id);

    /** Draws every list and card from the Snapshot with new elements, as a framework may. */
    function redraw(): void {
      ctx.root.replaceChildren(
        ...ctx.board.snapshot().lists.map(({ list, cards }) => {
          const ul = document.createElement("ul");
          ul.setAttribute("data-lp-cards", list.id);
          for (const card of cards) {
            const li = document.createElement("li");
            li.setAttribute("data-lp-card", card.id);
            li.id = card.id;
            li.tabIndex = 0;
            ul.append(li);
          }
          return ul;
        }),
      );
    }

    beforeEach(() => {
      ctx = setup();
      redraw();
      ctx.board.on("change", () => (when === "sync" ? redraw() : queueMicrotask(redraw)));
      drag = createDrag(ctx.root, ctx.board, { moveElements: false });
    });
    afterEach(() => drag.destroy());

    it("steps move the Board only; the pick-up and the focus follow the redrawn item", async () => {
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      key(ctx.card("a"), "ArrowDown");
      await settle();
      expect(boardOrder()).toEqual([["b", "a", "c"], ["d"], []]);
      expect([grabbed(), document.activeElement]).toEqual([["a"], ctx.card("a")]);
      key(ctx.card("a"), "ArrowRight");
      await settle();
      // The same position in the next list: after "d", at its end.
      expect(boardOrder()).toEqual([["b", "c"], ["d", "a"], []]);
      expect([grabbed(), document.activeElement]).toEqual([["a"], ctx.card("a")]);
      key(ctx.card("a"), " ");
      await settle();
      expect(grabbed()).toEqual([]);
      expect(ctx.moves).toHaveLength(2);
    });

    it.runIf(when === "microtask")(
      "the engine writes no element move: until the renderer runs, the DOM is as it was",
      () => {
        ctx.card("a").focus();
        key(ctx.card("a"), " ");
        const markup = ctx.root.innerHTML.replace(/ data-lp-grabbed=""/g, "");
        key(ctx.card("a"), "ArrowRight");
        expect(boardOrder()).toEqual([["b", "c"], ["a", "d"], []]); // first place: "a" was first
        expect(ctx.root.innerHTML.replace(/ data-lp-grabbed=""/g, "")).toBe(markup);
      },
    );

    it("Esc puts the Board back where the item was picked up", async () => {
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      key(ctx.card("a"), "ArrowRight");
      await settle();
      key(ctx.card("a"), "ArrowRight");
      await settle();
      key(ctx.card("a"), "Escape");
      await settle();
      expect(boardOrder()).toEqual([["a", "b", "c"], ["d"], []]);
      expect([grabbed(), document.activeElement]).toEqual([[], ctx.card("a")]);
    });

    it("a click away (the focus on body) after a step drops it, and leaves the focus there", async () => {
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      key(ctx.card("a"), "ArrowDown");
      await settle();
      expect(document.activeElement).toBe(ctx.card("a"));
      ctx.card("a").blur();
      await settle();
      expect([grabbed(), document.activeElement]).toEqual([[], document.body]);
    });

    it("a step the Board refuses is not announced as a move", async () => {
      drag.destroy();
      let moves = 0;
      drag = createDrag(ctx.root, ctx.board, {
        moveElements: false,
        messages: { move: () => `move ${++moves}` },
      });
      ctx.card("d").focus();
      key(ctx.card("d"), " ");
      key(ctx.card("d"), "ArrowRight"); // to "done"
      await settle();
      const ghost = document.createElement("ul");
      ghost.setAttribute("data-lp-cards", "ghost"); // not on the Board
      ctx.root.append(ghost);
      expect(() => key(ctx.card("d"), "ArrowRight")).toThrow(/unknown list/);
      expect(moves).toBe(1);
    });

    it("the observer is disconnected on a drop and by destroy()", () => {
      const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      key(ctx.card("a"), " ");
      expect(disconnect).toHaveBeenCalledTimes(1);
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      drag.destroy();
      expect(disconnect).toHaveBeenCalledTimes(2);
      disconnect.mockRestore();
    });

    it("the focus really leaving drops it; then a redraw neither marks nor focuses it", async () => {
      ctx.card("a").focus();
      key(ctx.card("a"), " ");
      (document.getElementById("elsewhere") as HTMLElement).focus();
      await settle();
      expect(grabbed()).toEqual([]);
      ctx.board.moveCard("d", "done", null); // a redraw after the drop
      await settle();
      expect(grabbed()).toEqual([]);
      expect(document.activeElement?.id).toBe("elsewhere");
    });
  },
);
