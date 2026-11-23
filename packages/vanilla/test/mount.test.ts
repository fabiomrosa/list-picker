// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  const element = (tag: string) => (item: Entity) => {
    const el = document.createElement(tag);
    el.textContent = item.title;
    rendered.set(item.id, el);
    return el;
  };
  return {
    root,
    board,
    rendered,
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
  afterEach(() => mounted?.destroy());

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
});
