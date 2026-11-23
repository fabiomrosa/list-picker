// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "../../core/src/index.ts";
import { createDrag } from "../src/index.ts";

type Entity = { id: string };

/** Two lists in the markup the engine expects (DEC-13), and the Board behind them. */
function setup() {
  document.body.innerHTML = `
    <div id="root">
      <section><ul data-lp-cards="todo">
        <li data-lp-card="a">A <button type="button">×</button></li>
        <li data-lp-card="b">B</li>
      </ul></section>
      <section><ul data-lp-cards="done"></ul></section>
    </div>`;
  const board = new Board<Entity, Entity>();
  board.addList({ id: "todo" }, null);
  board.addList({ id: "done" }, null);
  board.addCard("todo", { id: "a" }, null);
  board.addCard("todo", { id: "b" }, null);
  const root = document.getElementById("root") as HTMLElement;
  const card = (id: string) => root.querySelector(`[data-lp-card="${id}"]`) as HTMLElement;
  // The author's own inline display, which a drag must restore (set by script, so the style
  // attribute serializes the same before and after).
  card("a").style.display = "flex";
  // happy-dom has no layout: give card a a box.
  card("a").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
  return { root, board, card };
}

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }),
  );
}

describe("createDrag: drag start", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  beforeEach(() => {
    ctx = setup();
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => drag.destroy());

  it("leaves the DOM unchanged for a press and release under the threshold", () => {
    const before = ctx.root.innerHTML;
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 52, 32);
    expect(ctx.root.innerHTML).toBe(before);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
    pointer(ctx.card("a"), "pointerup", 52, 32);
    expect(ctx.root.innerHTML).toBe(before);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("shows a Clone over the card and a Placeholder in its place past the threshold", () => {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 56, 30);
    const clones = document.querySelectorAll<HTMLElement>("[data-lp-clone]");
    expect(clones).toHaveLength(1);
    const clone = clones[0] as HTMLElement;
    expect([clone.style.position, clone.style.left, clone.style.top]).toEqual([
      "fixed",
      "10px",
      "20px",
    ]);
    expect([clone.style.width, clone.style.height]).toEqual(["200px", "40px"]);
    expect(clone.style.pointerEvents).toBe("none");
    expect(clone.textContent).toContain("A");
    const placeholder = ctx.card("a").previousElementSibling as HTMLElement;
    expect(placeholder.hasAttribute("data-lp-placeholder")).toBe(true);
    expect([placeholder.style.width, placeholder.style.height]).toEqual(["200px", "40px"]);
    expect(ctx.card("a").style.display).toBe("none");
    expect(ctx.card("a").hasAttribute("data-lp-dragging")).toBe(true);
  });

  it("does nothing after destroy", () => {
    drag.destroy();
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 80, 30);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("shows the card again, as it was, when released after a drag", () => {
    const before = ctx.root.innerHTML;
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    pointer(ctx.card("a"), "pointerup", 70, 30);
    expect(ctx.root.innerHTML).toBe(before);
    expect(ctx.card("a").style.display).toBe("flex");
  });

  it.each(["pointercancel", "destroy"])("ends a drag on %s and listens no more", (how) => {
    const before = ctx.root.innerHTML;
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    if (how === "destroy") drag.destroy();
    else pointer(ctx.card("a"), "pointercancel", 70, 30);
    expect(ctx.root.innerHTML).toBe(before);
    pointer(ctx.card("a"), "pointermove", 90, 30);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("starts no drag from a control inside the card", () => {
    const button = ctx.card("a").querySelector("button") as HTMLButtonElement;
    pointer(button, "pointerdown", 50, 30);
    pointer(button, "pointermove", 80, 30);
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("still drags a card that sits inside a link or an editable area", () => {
    const link = document.createElement("a");
    link.href = "#";
    ctx.root.before(link);
    link.append(ctx.root);
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 80, 30);
    expect(document.querySelectorAll("[data-lp-clone]")).toHaveLength(1);
  });

  it("ignores a second pointer during a press", () => {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    ctx
      .card("b")
      .dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 90, clientY: 90, pointerId: 2 }),
      );
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("removes every id from the Clone", () => {
    ctx.card("a").innerHTML = '<span id="inner">A</span>';
    ctx.card("a").id = "outer";
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    expect(document.querySelector("[data-lp-clone]")?.querySelector("[id]")).toBeNull();
    expect(document.querySelector("[data-lp-clone]")?.id).toBe("");
  });
});

describe("createDrag: the Clone follows the pointer", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const clone = () => document.querySelector("[data-lp-clone]") as HTMLElement;
  beforeEach(() => {
    ctx = setup();
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => {
    drag.destroy();
    vi.restoreAllMocks();
  });

  it("moves the Clone by the pointer's offset from the press, on the next frame", async () => {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    pointer(ctx.card("a"), "pointermove", 95, 12);
    await frame();
    expect(clone().style.transform).toBe("translate(45px, -18px)");
  });

  it("writes once per frame however many moves arrive", async () => {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    await frame();
    const raf = vi.spyOn(window, "requestAnimationFrame");
    for (const x of [71, 72, 73, 74]) pointer(ctx.card("a"), "pointermove", x, 30);
    expect(raf).toHaveBeenCalledTimes(1);
    await frame();
    expect(clone().style.transform).toBe("translate(24px, 0px)");
  });

  it.each(["release", "destroy"])("cancels a pending frame on %s", (how) => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    if (how === "destroy") drag.destroy();
    else pointer(ctx.card("a"), "pointerup", 70, 30);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe("createDrag: the Placeholder follows the drop target", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  let under: Element | null;
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const placeholder = () => document.querySelector("[data-lp-placeholder]") as HTMLElement;
  const list = (id: string) => ctx.root.querySelector(`[data-lp-cards="${id}"]`) as HTMLElement;
  /** Order of a list's children, by card id, "_" for the Placeholder, hidden card skipped. */
  const order = (id: string) =>
    [...list(id).children]
      .filter((el) => (el as HTMLElement).style.display !== "none")
      .map((el) =>
        el.hasAttribute("data-lp-placeholder") ? "_" : el.getAttribute("data-lp-card"),
      );

  beforeEach(() => {
    ctx = setup();
    // Card b spans y 100–140; the engine asks what is under the pointer.
    ctx.card("b").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    under = null;
    document.elementFromPoint = () => under;
    drag = createDrag(ctx.root, ctx.board);
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
  });
  afterEach(() => drag.destroy());

  async function moveTo(target: Element | null, y: number, from: Element = ctx.card("a")) {
    under = target;
    pointer(from, "pointermove", 60, y);
    await frame();
  }

  it("goes before a card above its middle and after it below", async () => {
    await moveTo(ctx.card("b"), 130);
    expect(order("todo")).toEqual(["b", "_"]);
    await moveTo(ctx.card("b"), 110);
    expect(order("todo")).toEqual(["_", "b"]);
  });

  it("goes to the end of an empty list, or below the last card", async () => {
    await moveTo(list("done"), 300);
    expect(order("done")).toEqual(["_"]);
    expect(order("todo")).toEqual(["b"]);
    await moveTo(list("todo"), 300);
    expect(order("todo")).toEqual(["b", "_"]);
  });

  it("follows the nearest card's middle across the gaps between cards", async () => {
    // The pointer is over the list itself (a gap), above card b's middle (120).
    await moveTo(list("todo"), 95);
    expect(order("todo")).toEqual(["_", "b"]);
    await moveTo(list("todo"), 145);
    expect(order("todo")).toEqual(["b", "_"]);
  });

  it("does not write the DOM while the place is unchanged, nor outside every list", async () => {
    const writes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => writes.push(...records));
    observer.observe(ctx.root, { childList: true, subtree: true });
    const settle = () => new Promise((resolve) => setTimeout(resolve));
    // Already before b, with the hidden dragged card in between: no write.
    await moveTo(ctx.card("b"), 105);
    await moveTo(placeholder(), 60);
    await settle();
    expect(writes).toEqual([]);
    // A real change is seen (the observer works)...
    await moveTo(ctx.card("b"), 130);
    await settle();
    expect(writes.length).toBeGreaterThan(0);
    writes.length = 0;
    // ...then nothing outside the lists, or for a pointer still past b's middle.
    await moveTo(ctx.root, 500);
    await moveTo(null, 500);
    await moveTo(ctx.card("b"), 131);
    await settle();
    observer.disconnect();
    expect(writes).toEqual([]);
    expect(order("todo")).toEqual(["b", "_"]);
  });

  it("does not rewrite the end of a list that is also the root holding the Clone", async () => {
    drag.destroy();
    const solo = list("done");
    solo.innerHTML = '<li data-lp-card="x">X</li><li data-lp-card="y">Y</li>';
    const x = solo.querySelector("[data-lp-card=x]") as HTMLElement;
    x.getBoundingClientRect = () => new DOMRect(0, 0, 100, 20);
    (solo.querySelector("[data-lp-card=y]") as HTMLElement).getBoundingClientRect = () =>
      new DOMRect(0, 30, 100, 20);
    drag = createDrag(solo, ctx.board);
    pointer(x, "pointerdown", 5, 5);
    pointer(x, "pointermove", 5, 15);
    await moveTo(solo, 200, x);
    const writes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => writes.push(...records));
    observer.observe(solo, { childList: true });
    await moveTo(solo, 210, x);
    await new Promise((resolve) => setTimeout(resolve));
    observer.disconnect();
    expect(writes).toEqual([]);
  });
});
