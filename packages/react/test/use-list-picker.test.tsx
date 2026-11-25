// @vitest-environment happy-dom
import { Board } from "@list-picker/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useBoard, useListPicker } from "../src/index.ts";

type Entity = { id: string };

function setup() {
  const board = new Board<Entity, Entity>();
  for (const id of ["todo", "doing"]) board.addList({ id }, null);
  for (const id of ["a", "b"]) board.addCard("todo", { id }, null);
  return board;
}

/** A board drawn by React from the Snapshot, the engine attached by the hook's getters. */
function Kanban({ board }: { board: Board<Entity, Entity> }) {
  const { lists } = useBoard(board);
  const picker = useListPicker(board);
  return (
    <div ref={picker.ref}>
      {lists.map(({ list, cards }) => (
        <section key={list.id} {...picker.list(list.id)}>
          <h2 {...picker.listHandle(list.id)}>{list.id}</h2>
          <ul aria-label={list.id} {...picker.cards(list.id)}>
            {cards.map((card) => (
              <li key={card.id} {...picker.card(card.id)}>
                {card.id}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const drawn = (list: string) => screen.getByRole("list", { name: list }).textContent;
const card = (id: string) => screen.getByText(id, { selector: "[data-lp-card]" });
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
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

afterEach(cleanup); // Vitest runs without globals: Testing Library cannot register it itself

it("gives the engine's attributes and focus to the user's own markup", () => {
  render(<Kanban board={setup()} />);
  expect(card("a").getAttribute("data-lp-card")).toBe("a");
  expect(card("a").tabIndex).toBe(0);
  expect(screen.getByRole("list", { name: "doing" }).getAttribute("data-lp-cards")).toBe("doing");
  const handle = screen.getByRole("heading", { name: "todo" });
  expect([handle.hasAttribute("data-lp-list-handle"), handle.tabIndex]).toEqual([true, 0]);
  expect(handle.closest("section")?.getAttribute("data-lp-list")).toBe("todo");
});

it("a keyboard step to another list: the Board moves, React draws it, the pick-up stays", async () => {
  const board = setup();
  render(<Kanban board={board} />);
  card("a").focus();
  await act(async () => key(card("a"), " "));
  await act(async () => key(card("a"), "ArrowRight"));
  await settle();
  expect([...board.cards("doing")].map((c) => c.id)).toEqual(["a"]);
  expect([drawn("todo"), drawn("doing")]).toEqual(["b", "a"]);
  expect([document.activeElement, card("a").hasAttribute("data-lp-grabbed")]).toEqual([
    card("a"),
    true,
  ]);
});

it("a pointer drop in another list: the Board moves and React draws it, with no error", async () => {
  const board = setup();
  render(<Kanban board={board} />);
  const doing = screen.getByRole("list", { name: "doing" });
  card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
  document.elementFromPoint = () => doing;
  await act(async () => {
    pointer(card("a"), "pointerdown", 50, 30);
    pointer(card("a"), "pointermove", 70, 300);
  });
  await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  await act(async () => pointer(card("a"), "pointerup", 70, 300));
  expect([...board.cards("doing")].map((c) => c.id)).toEqual(["a"]);
  expect([drawn("todo"), drawn("doing")]).toEqual(["b", "a"]);
  expect(document.querySelector("[data-lp-placeholder], [data-lp-clone]")).toBeNull();
});

it("unmounting removes every listener the engine added, and its announcement region", () => {
  // Every listener added and still there, by target; the originals still run (React needs them).
  const live: [EventTarget, string, unknown][] = [];
  // Where the elements' `addEventListener` lives (happy-dom's own EventTarget, not the global one).
  let proto = Object.getPrototypeOf(document.body);
  while (!Object.hasOwn(proto, "addEventListener")) proto = Object.getPrototypeOf(proto);
  const { addEventListener: add, removeEventListener: remove } = proto as EventTarget;
  const adds = vi.spyOn(proto as EventTarget, "addEventListener");
  const removes = vi.spyOn(proto as EventTarget, "removeEventListener");
  adds.mockImplementation(function (this: EventTarget, ...args) {
    live.push([this, args[0], args[1]]);
    return add.apply(this, args);
  });
  removes.mockImplementation(function (this: EventTarget, ...args) {
    const at = live.findIndex(([t, k, l]) => t === this && k === args[0] && l === args[1]);
    if (at >= 0) live.splice(at, 1);
    return remove.apply(this, args);
  });
  const { container, unmount } = render(<Kanban board={setup()} />);
  // The engine listens on the root the hook's ref is on, and on the document (Esc) during a drag;
  // React's own listeners (on the container, and `selectionchange` on the document) are not its.
  const root = container.firstElementChild as Element;
  const engine = () =>
    live.filter(([target, type]) => target === root || (target === document && type === "keydown"));
  const attached = engine().length;
  unmount();
  adds.mockRestore();
  removes.mockRestore();
  expect(attached).toBeGreaterThan(0);
  expect(engine()).toEqual([]);
  expect(document.querySelector("[aria-live]")).toBeNull();
});
