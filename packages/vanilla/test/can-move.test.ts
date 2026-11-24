// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board, type MoveEvent } from "../../core/src/index.ts";
import { createDrag, type ProposedMove } from "../src/index.ts";

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

describe("createDrag: rules for where items may move (canMove)", () => {
  let root: HTMLElement;
  let board: Board<Entity, Entity>;
  let drag: ReturnType<typeof createDrag> | undefined;
  let moves: MoveEvent[];
  let asked: ProposedMove[];
  /** The rule under test: "done" takes no card, card "b" never moves, list "later" stays put. */
  const rule = (move: ProposedMove) => {
    asked.push(move);
    return move.toListId !== "done" && move.id !== "b" && move.id !== "later";
  };
  const elementFromPoint = document.elementFromPoint;
  beforeEach(() => {
    document.body.innerHTML = `<div id="root">${["todo", "done", "later"]
      .map(
        (id) => `<section data-lp-list="${id}"><h2 data-lp-list-handle tabindex="0">${id}</h2>
          <ul data-lp-cards="${id}"></ul></section>`,
      )
      .join("")}</div>`;
    root = document.getElementById("root") as HTMLElement;
    board = new Board<Entity, Entity>();
    for (const id of ["todo", "done", "later"]) board.addList({ id }, null);
    for (const [list, id] of [
      ["todo", "a"],
      ["todo", "b"],
      ["done", "c"],
    ] as const) {
      board.addCard(list, { id }, null);
      const card = document.createElement("li");
      card.setAttribute("data-lp-card", id);
      card.tabIndex = 0;
      root.querySelector(`[data-lp-cards="${list}"]`)?.append(card);
    }
    moves = [];
    asked = [];
    board.on("move", (event) => moves.push(event));
    drag = createDrag(root, board, { canMove: rule });
  });
  afterEach(() => {
    drag?.destroy();
    document.elementFromPoint = elementFromPoint;
  });

  const card = (id: string) => root.querySelector(`[data-lp-card="${id}"]`) as HTMLElement;
  const cards = (id: string) => root.querySelector(`[data-lp-cards="${id}"]`) as HTMLElement;
  const placeholderIn = () =>
    root.querySelector("[data-lp-placeholder]")?.parentElement?.getAttribute("data-lp-cards");
  const boardOrder = () =>
    [...board.lists()].map((list) => [list.id, [...board.cards(list.id)].map((c) => c.id)]);

  async function dragOver(id: string, under: Element, y: number) {
    card(id).getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => under;
    pointer(card(id), "pointerdown", 50, 30);
    pointer(card(id), "pointermove", 70, y);
    await frame();
  }

  it("keeps the Placeholder out of a refused list: the drop lands at the last allowed place", async () => {
    await dragOver("a", cards("done"), 300);
    expect(placeholderIn()).toBe("todo");
    expect(asked).toContainEqual({ kind: "card", id: "a", toListId: "done", beforeId: null });
    document.elementFromPoint = () => cards("later");
    pointer(card("a"), "pointermove", 70, 310);
    await frame();
    expect(placeholderIn()).toBe("later");
    document.elementFromPoint = () => cards("done");
    pointer(card("a"), "pointermove", 70, 300);
    await frame();
    pointer(card("a"), "pointerup", 70, 300);
    expect(boardOrder()).toEqual([
      ["todo", ["b"]],
      ["done", ["c"]],
      ["later", ["a"]],
    ]);
  });

  it("lets a locked card drag but land where it was, with no move", async () => {
    await dragOver("b", cards("later"), 300);
    expect(placeholderIn()).toBe("todo");
    pointer(card("b"), "pointerup", 70, 300);
    expect(moves).toEqual([]);
    card("b").focus();
    key(card("b"), " ");
    key(card("b"), "ArrowUp");
    key(card("b"), "ArrowRight");
    expect(moves).toEqual([]);
  });

  it("skips a refused list with the keyboard, to the next allowed one", () => {
    card("a").focus();
    key(card("a"), " ");
    key(card("a"), "ArrowRight");
    expect(boardOrder()[2]).toEqual(["later", ["a"]]);
    expect(card("a").parentElement).toBe(cards("later"));
    key(card("a"), "ArrowRight");
    key(card("a"), "ArrowLeft");
    expect(boardOrder()[0]).toEqual(["todo", ["a", "b"]]);
    key(card("a"), "ArrowDown");
    expect(boardOrder()[0]).toEqual(["todo", ["b", "a"]]);
    key(card("a"), "Escape");
    expect(boardOrder()[0]).toEqual(["todo", ["a", "b"]]);
  });

  it("asks for lists too, with a null list", () => {
    const handle = root.querySelector(
      '[data-lp-list="later"] [data-lp-list-handle]',
    ) as HTMLElement;
    handle.focus();
    key(handle, " ");
    key(handle, "ArrowLeft");
    expect(asked).toContainEqual({ kind: "list", id: "later", toListId: null, beforeId: "done" });
    expect([...board.lists()].map((list) => list.id)).toEqual(["todo", "done", "later"]);
  });

  it("skips a refused place among the lists, to the next allowed one", () => {
    drag?.destroy();
    drag = createDrag(root, board, { canMove: (move) => move.beforeId !== "later" });
    const handle = root.querySelector('[data-lp-list="todo"] [data-lp-list-handle]') as HTMLElement;
    handle.focus();
    key(handle, " ");
    key(handle, "ArrowRight");
    expect([...board.lists()].map((list) => list.id)).toEqual(["done", "later", "todo"]);
  });

  it("asks again at the drop: a place refused since it was shown is not applied", async () => {
    drag?.destroy();
    let full = false;
    drag = createDrag(root, board, { canMove: (move) => !(full && move.toListId === "done") });
    await dragOver("a", cards("done"), 300);
    expect(placeholderIn()).toBe("done");
    full = true;
    pointer(card("a"), "pointerup", 70, 300);
    expect(moves).toEqual([]);
  });

  it("gives canMove the place the drop applies, past a card the Board removed", async () => {
    drag?.destroy();
    const seen: (string | null)[] = [];
    drag = createDrag(root, board, {
      canMove: (move) => {
        seen.push(move.beforeId);
        return move.beforeId !== null || move.toListId !== "done";
      },
    });
    card("c").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    await dragOver("a", card("c"), 105);
    expect(placeholderIn()).toBe("done");
    board.removeCard("c");
    pointer(card("a"), "pointerup", 70, 105);
    expect(seen.at(-1)).toBeNull();
    expect(moves).toEqual([]);
  });

  it("always allows the origin: back there by pointer or by keyboard", async () => {
    drag?.destroy();
    // Refuses card a before b: where a was picked up.
    drag = createDrag(root, board, { canMove: (move) => move.beforeId !== "b" });
    await dragOver("a", cards("later"), 300);
    expect(placeholderIn()).toBe("later");
    card("b").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    document.elementFromPoint = () => card("b");
    pointer(card("a"), "pointermove", 70, 105);
    await frame();
    expect(placeholderIn()).toBe("todo");
    pointer(card("a"), "pointerup", 70, 105);
    expect(moves).toEqual([]);
    card("a").focus();
    key(card("a"), " ");
    key(card("a"), "ArrowDown");
    key(card("a"), "ArrowUp");
    expect(boardOrder()[0]).toEqual(["todo", ["a", "b"]]);
  });

  it("asks for a pointer drag of a list, with a null list", async () => {
    const list = root.querySelector('[data-lp-list="later"]') as HTMLElement;
    const handle = list.querySelector("[data-lp-list-handle]") as HTMLElement;
    const todo = root.querySelector('[data-lp-list="todo"]') as HTMLElement;
    list.getBoundingClientRect = () => new DOMRect(400, 0, 100, 300);
    todo.getBoundingClientRect = () => new DOMRect(0, 0, 100, 300);
    document.elementFromPoint = () => todo;
    pointer(handle, "pointerdown", 450, 10);
    pointer(handle, "pointermove", 10, 10);
    await frame();
    expect(asked).toContainEqual({ kind: "list", id: "later", toListId: null, beforeId: "todo" });
    pointer(handle, "pointerup", 10, 10);
    expect([...board.lists()].map((l) => l.id)).toEqual(["todo", "done", "later"]);
  });
});
