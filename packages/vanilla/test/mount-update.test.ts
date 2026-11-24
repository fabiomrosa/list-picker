// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Board } from "../../core/src/index.ts";
import { type Mount, mount } from "../src/index.ts";

type Entity = { id: string; title: string };

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

/** Lets the reconcile, queued after a change, run. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe("mount: a changed value", () => {
  let root: HTMLElement;
  let board: Board<Entity, Entity>;
  let mounted: Mount;
  /** The Renderers' latest element per id, and how often each id was rendered. */
  const rendered = new Map<string, HTMLElement>();
  const renders = new Map<string, number>();
  let fail = false;
  const element = (tag: string) => (item: Entity) => {
    if (fail) throw new Error("render failed");
    const el = document.createElement(tag);
    el.textContent = item.title;
    rendered.set(item.id, el);
    renders.set(item.id, (renders.get(item.id) ?? 0) + 1);
    return el;
  };
  beforeEach(() => {
    document.body.innerHTML = `<main id="root"></main>`;
    root = document.getElementById("root") as HTMLElement;
    board = new Board<Entity, Entity>();
    board.addList({ id: "todo", title: "To do" }, null);
    board.addList({ id: "done", title: "Done" }, null);
    board.addCard("todo", { id: "a", title: "A" }, null);
    board.addCard("todo", { id: "b", title: "B" }, null);
    rendered.clear();
    renders.clear();
    fail = false;
    mounted = mount(root, board, { renderList: element("h2"), renderCard: element("article") });
  });
  const elementFromPoint = document.elementFromPoint;
  afterEach(() => {
    mounted.destroy();
    document.elementFromPoint = elementFromPoint;
  });

  const said = () => document.querySelector("[data-lp-live]")?.textContent;
  const texts = () =>
    [...root.querySelectorAll("[data-lp-list]")].map((list) =>
      [...list.querySelectorAll("[data-lp-list-handle], [data-lp-card]")].map(
        (el) => el.textContent,
      ),
    );

  it("draws a renamed list with its Renderer's new element, in place, touching nothing else", async () => {
    const old = rendered.get("todo") as HTMLElement;
    const a = rendered.get("a");
    board.updateList({ id: "todo", title: "Doing now" });
    expect(renders.get("todo")).toBe(2);
    expect(renders.get("a")).toBe(1);
    await settle();
    const header = rendered.get("todo") as HTMLElement;
    expect(header).not.toBe(old);
    expect(old.isConnected).toBe(false);
    expect(header.hasAttribute("data-lp-list-handle")).toBe(true);
    expect(header.tabIndex).toBe(0);
    expect(texts()).toEqual([["Doing now", "A", "B"], ["Done"]]);
    expect(rendered.get("a")).toBe(a);
    expect(a?.isConnected).toBe(true);
  });

  it("draws an edited card once, even after several updates and a move before the write", async () => {
    board.updateCard({ id: "a", title: "A1" });
    board.updateCard({ id: "a", title: "A2" });
    board.moveCard("a", "done", null);
    await settle();
    expect(texts()).toEqual([
      ["To do", "B"],
      ["Done", "A2"],
    ]);
    expect(root.querySelectorAll("[data-lp-card='a']")).toHaveLength(1);
    expect(rendered.get("a")?.tabIndex).toBe(0);
    board.updateCard({ id: "a", title: "A3" });
    board.removeCard("a");
    await settle();
    expect(root.querySelector("[data-lp-card='a']")).toBeNull();
  });

  it("keeps the focus, and a keyboard pick up, on the new element; announcements use its label", async () => {
    const old = rendered.get("a") as HTMLElement;
    old.focus();
    key(old, " ");
    board.updateCard({ id: "a", title: "Alpha" });
    await settle();
    const card = rendered.get("a") as HTMLElement;
    expect(document.activeElement).toBe(card);
    expect(card.hasAttribute("data-lp-grabbed")).toBe(true);
    key(card, "ArrowDown");
    expect(said()).toBe("Moved Alpha. To do, position 2 of 2.");
    expect(texts()).toEqual([["To do", "B", "Alpha"], ["Done"]]);
    key(card, " ");
    expect(card.hasAttribute("data-lp-grabbed")).toBe(false);
  });

  it("keeps a list's keyboard pick up when its header is redrawn", async () => {
    const old = rendered.get("todo") as HTMLElement;
    old.focus();
    key(old, " ");
    board.updateList({ id: "todo", title: "First" });
    await settle();
    const header = rendered.get("todo") as HTMLElement;
    expect(document.activeElement).toBe(header);
    key(header, "ArrowRight");
    expect([...board.lists()].map((list) => list.id)).toEqual(["done", "todo"]);
    expect(said()).toBe("Moved First. Position 2 of 2.");
  });

  it("throws a Renderer's error from the update and keeps the old element", async () => {
    const old = rendered.get("a") as HTMLElement;
    fail = true;
    expect(() => board.updateCard({ id: "a", title: "A1" })).toThrow("render failed");
    await settle();
    expect(old.isConnected).toBe(true);
    expect(texts()).toEqual([["To do", "A", "B"], ["Done"]]);
    fail = false;
    board.addCard("done", { id: "c", title: "C" }, null);
    await settle();
    expect(texts()).toEqual([
      ["To do", "A1", "B"],
      ["Done", "C"],
    ]);
  });

  it("waits for a pointer drag to end before drawing its card's new value", async () => {
    const old = rendered.get("a") as HTMLElement;
    old.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => null;
    pointer(old, "pointerdown", 50, 30);
    pointer(old, "pointermove", 70, 30);
    board.updateCard({ id: "a", title: "A1" });
    await settle();
    expect(old.isConnected).toBe(true);
    pointer(old, "pointerup", 70, 30);
    await settle();
    expect(old.isConnected).toBe(false);
    expect(texts()).toEqual([["To do", "A1", "B"], ["Done"]]);
  });

  it("keeps a pointer press on a card redrawn before the drag starts", async () => {
    const old = rendered.get("a") as HTMLElement;
    pointer(old, "pointerdown", 50, 30);
    board.updateCard({ id: "a", title: "A1" });
    await settle();
    const card = rendered.get("a") as HTMLElement;
    card.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    document.elementFromPoint = () => null;
    pointer(card, "pointermove", 80, 30);
    expect(root.querySelector("[data-lp-clone]")?.textContent).toBe("A1");
    pointer(card, "pointerup", 80, 30);
    expect(root.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("makes a header focusable even when its Renderer marks it as the handle", async () => {
    mounted.destroy();
    document.body.innerHTML = `<main id="root"></main>`;
    root = document.getElementById("root") as HTMLElement;
    mounted = mount(root, board, {
      renderList: (list) => {
        const header = element("h2")(list);
        header.setAttribute("data-lp-list-handle", "");
        return header;
      },
      renderCard: element("article"),
    });
    expect(rendered.get("todo")?.tabIndex).toBe(0);
  });
});
