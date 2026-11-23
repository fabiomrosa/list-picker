// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "../../core/src/index.ts";
import { type Mount, mount } from "../src/index.ts";

type Entity = { id: string; title: string };

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }),
  );
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function setup() {
  document.body.innerHTML = `<main id="root"><p>kept</p></main>`;
  const board = new Board<Entity, Entity>();
  board.addList({ id: "todo", title: "To do" }, null);
  board.addList({ id: "done", title: "Done" }, null);
  board.addCard("todo", { id: "a", title: "A" }, null);
  board.addCard("todo", { id: "b", title: "B" }, null);
  board.addCard("done", { id: "c", title: "C" }, null);
  const root = document.getElementById("root") as HTMLElement;
  const rendered = new Map<string, HTMLElement>();
  const renders = new Map<string, number>();
  const element = (tag: string) => (item: Entity) => {
    const el = document.createElement(tag);
    el.textContent = item.title;
    rendered.set(item.id, el);
    renders.set(item.id, (renders.get(item.id) ?? 0) + 1);
    return el;
  };
  return {
    root,
    board,
    rendered,
    renders,
    renderers: { renderList: element("h2"), renderCard: element("article") },
  };
}

describe("mount", () => {
  let ctx: ReturnType<typeof setup>;
  let mounted: Mount | undefined;
  beforeEach(() => {
    ctx = setup();
    mounted = undefined;
  });
  const elementFromPoint = document.elementFromPoint;
  afterEach(() => {
    mounted?.destroy();
    document.elementFromPoint = elementFromPoint;
  });

  it("draws each list and card from the Renderers' own elements, in Board order", () => {
    mounted = mount(ctx.root, ctx.board, ctx.renderers);
    const lists = [...ctx.root.querySelectorAll("[data-lp-list]")];
    expect(lists.map((el) => el.getAttribute("data-lp-list"))).toEqual(["todo", "done"]);
    for (const list of lists) {
      const id = list.getAttribute("data-lp-list") as string;
      const [handle, cards] = [...list.children];
      expect(handle).toBe(ctx.rendered.get(id));
      expect(handle?.hasAttribute("data-lp-list-handle")).toBe(true);
      expect(cards?.getAttribute("data-lp-cards")).toBe(id);
      const cardIds = [...(cards?.children ?? [])].map((el) => el.getAttribute("data-lp-card"));
      expect(cardIds).toEqual([...ctx.board.cards(id)].map((card) => card.id));
      for (const el of cards?.children ?? []) {
        expect(el).toBe(ctx.rendered.get(el.getAttribute("data-lp-card") as string));
      }
    }
    expect(ctx.root.firstElementChild?.textContent).toBe("kept");
  });

  it("makes the mounted cards draggable", async () => {
    mounted = mount(ctx.root, ctx.board, ctx.renderers);
    const a = ctx.rendered.get("a") as HTMLElement;
    const b = ctx.rendered.get("b") as HTMLElement;
    // happy-dom has no layout: give the cards boxes, and say what is under the pointer.
    a.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    b.getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    document.elementFromPoint = () => b;
    pointer(a, "pointerdown", 50, 30);
    pointer(a, "pointermove", 70, 30);
    pointer(a, "pointermove", 60, 130);
    await frame();
    pointer(a, "pointerup", 60, 130);
    expect([...ctx.board.cards("todo")].map((card) => card.id)).toEqual(["b", "a"]);
    expect(b.nextElementSibling).toBe(a);
  });

  it("throws for a missing root", () => {
    const missing = document.getElementById("nope") as HTMLElement;
    expect(() => mount(missing, ctx.board, ctx.renderers)).toThrow(/^list-picker: .*root/);
  });

  it("throws for a Renderer that returns no element, and leaves the root as it was", () => {
    const before = ctx.root.innerHTML;
    const renderCard = (card: Entity) =>
      (card.id === "c" ? "C" : ctx.renderers.renderCard(card)) as HTMLElement;
    expect(() => mount(ctx.root, ctx.board, { ...ctx.renderers, renderCard })).toThrow(
      /^list-picker: .*"c"/,
    );
    const renderList = () => null as unknown as HTMLElement;
    expect(() => mount(ctx.root, ctx.board, { ...ctx.renderers, renderList })).toThrow(
      /^list-picker: .*"todo"/,
    );
    expect(ctx.root.innerHTML).toBe(before);
  });

  it("leaves the root as before after destroy, and drags nothing", () => {
    const before = ctx.root.innerHTML;
    mount(ctx.root, ctx.board, ctx.renderers).destroy();
    expect(ctx.root.innerHTML).toBe(before);
    const a = ctx.rendered.get("a") as HTMLElement;
    ctx.root.append(a);
    pointer(a, "pointerdown", 50, 30);
    pointer(a, "pointermove", 70, 30);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("throws for an element given twice, or already in the document, and changes nothing", () => {
    const shared = document.createElement("article");
    expect(() =>
      mount(ctx.root, ctx.board, { ...ctx.renderers, renderCard: () => shared }),
    ).toThrow(/^list-picker: .*"b"/);
    expect(shared.attributes).toHaveLength(0);
    const before = ctx.root.innerHTML;
    const kept = ctx.root.firstElementChild as HTMLElement;
    const renderList = (list: Entity) =>
      list.id === "todo" ? kept : ctx.renderers.renderList(list);
    expect(() => mount(ctx.root, ctx.board, { ...ctx.renderers, renderList })).toThrow(
      /^list-picker: .*"todo"/,
    );
    expect(ctx.root.innerHTML).toBe(before);
  });
});

describe("mount: following the Board", () => {
  let ctx: ReturnType<typeof setup>;
  let mounted: Mount;
  /** Lets the reconcile, queued after a change, run. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  /** The Board as the DOM shows it: list ids, each with its card ids. */
  const domBoard = () =>
    [...ctx.root.querySelectorAll("[data-lp-list]")].map((list) => [
      list.getAttribute("data-lp-list"),
      [...list.querySelectorAll("[data-lp-card]")].map((card) => card.getAttribute("data-lp-card")),
    ]);
  const board = () =>
    [...ctx.board.lists()].map((list) => [
      list.id,
      [...ctx.board.cards(list.id)].map((card) => card.id),
    ]);
  beforeEach(() => {
    ctx = setup();
    mounted = mount(ctx.root, ctx.board, ctx.renderers);
  });
  afterEach(() => mounted.destroy());

  it("follows every Board operation, rendering each list and card once and keeping its element", async () => {
    const a = ctx.rendered.get("a");
    const todo = ctx.rendered.get("todo");
    ctx.board.addCard("todo", { id: "d", title: "D" }, "a");
    ctx.board.addList({ id: "doing", title: "Doing" }, "done");
    await settle();
    expect(domBoard()).toEqual(board());
    ctx.board.moveCard("a", "done", null);
    ctx.board.moveCard("c", "doing", null);
    ctx.board.moveList("done", "todo");
    ctx.board.removeCard("b");
    await settle();
    expect(domBoard()).toEqual(board());
    ctx.board.removeList("doing");
    ctx.board.moveList("todo", "done");
    await settle();
    expect(domBoard()).toEqual(board());
    expect(ctx.rendered.get("a")).toBe(a);
    expect(ctx.root.contains(a ?? null)).toBe(true);
    expect(ctx.root.contains(todo ?? null)).toBe(true);
    expect([...ctx.renders.values()].every((count) => count === 1)).toBe(true);
    expect(ctx.root.querySelector("[data-lp-card='b']")).toBeNull();
    expect(ctx.root.firstElementChild?.textContent).toBe("kept");
  });

  it("writes nothing after a drag and drop: the engine has already moved the card", async () => {
    const a = ctx.rendered.get("a") as HTMLElement;
    const b = ctx.rendered.get("b") as HTMLElement;
    a.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    b.getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    const elementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => b;
    pointer(a, "pointerdown", 50, 30);
    pointer(a, "pointermove", 70, 30);
    pointer(a, "pointermove", 60, 130);
    await frame();
    // The reconcile's only DOM writes; the engine puts the card in place with `replaceWith`.
    const writes = (["after", "before", "append"] as const).map((name) =>
      vi.spyOn(Element.prototype, name),
    );
    pointer(a, "pointerup", 60, 130);
    document.elementFromPoint = elementFromPoint;
    await settle();
    const calls = writes.flatMap((write) => write.mock.calls);
    for (const write of writes) write.mockRestore();
    expect(calls).toEqual([]);
    expect(domBoard()).toEqual(board());
  });

  it("touches nothing after destroy, even for a change made just before it", async () => {
    ctx.board.addCard("todo", { id: "d", title: "D" }, null);
    mounted.destroy();
    ctx.board.addCard("todo", { id: "e", title: "E" }, null);
    await settle();
    expect(ctx.root.innerHTML).toBe("<p>kept</p>");
    expect(ctx.renders.has("d") || ctx.renders.has("e")).toBe(false);
  });

  it("moves only the element out of place, for a list or a card moved to the end", async () => {
    for (const id of ["x", "y", "z"]) ctx.board.addCard("todo", { id, title: id }, null);
    ctx.board.addList({ id: "later", title: "Later" }, null);
    await settle();
    const writes = (["after", "before", "append"] as const).map((name) =>
      vi.spyOn(Element.prototype, name),
    );
    ctx.board.moveCard("a", "todo", null);
    ctx.board.moveList("todo", null);
    await settle();
    const calls = writes.flatMap((write) => write.mock.calls);
    for (const write of writes) write.mockRestore();
    expect(calls).toHaveLength(2);
    expect(domBoard()).toEqual(board());
  });

  it("renders nothing twice when a Renderer throws, and catches up on the next change", async () => {
    const queued: (() => void)[] = [];
    const microtask = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((task) => {
      queued.push(task);
    });
    let fail = true;
    const renderCard = ctx.renderers.renderCard;
    ctx.renderers.renderCard = (card) => {
      if (card.id === "bad" && fail) throw new Error("render failed");
      return renderCard(card);
    };
    ctx.board.addList({ id: "new", title: "New" }, null);
    ctx.board.addCard("new", { id: "bad", title: "Bad" }, null);
    expect(() => queued.shift()?.()).toThrow("render failed");
    fail = false;
    ctx.board.addCard("new", { id: "good", title: "Good" }, null);
    queued.shift()?.();
    microtask.mockRestore();
    expect(domBoard()).toEqual(board());
    expect(ctx.renders.get("new")).toBe(1);
  });

  it("matches the Board after any sequence of moves", async () => {
    let reached = 0;
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(fc.nat(9), fc.nat(9), fc.nat(9)), { minLength: 1, maxLength: 12 }),
        async (moves) => {
          mounted.destroy();
          ctx = setup();
          const lists = ["todo", "done", "l2", "l3"];
          for (const id of lists.slice(2)) ctx.board.addList({ id, title: id }, null);
          for (const id of "defghij") ctx.board.addCard("l2", { id, title: id }, null);
          mounted = mount(ctx.root, ctx.board, ctx.renderers);
          const ids = [...ctx.board.lists()].flatMap((list) => [...ctx.board.cards(list.id)]);
          for (const [what, to, before] of moves) {
            if (what === 0) {
              const others = lists.filter((id) => id !== lists[to % 4]);
              ctx.board.moveList(
                lists[to % 4] as string,
                before % 4 === 3 ? null : (others[before % 3] as string),
              );
            } else {
              const card = ids[what % ids.length]?.id as string;
              const list = lists[to % 4] as string;
              const inList = [...ctx.board.cards(list)].filter((c) => c.id !== card);
              ctx.board.moveCard(card, list, inList[before % (inList.length + 1)]?.id ?? null);
            }
          }
          await settle();
          if (moves.length > 3) reached++;
          expect(domBoard()).toEqual(board());
        },
      ),
      { numRuns: 200, interruptAfterTimeLimit: 50_000, markInterruptAsFailure: true },
    );
    expect(reached).toBeGreaterThan(50);
  }, 60_000);
});
