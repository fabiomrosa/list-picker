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

describe("createDrag: drop", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  let under: Element | null;
  let moves: unknown[];
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const list = (id: string) => ctx.root.querySelector(`[data-lp-cards="${id}"]`) as HTMLElement;
  const domOrder = (id: string) =>
    [...list(id).children].map((el) => el.getAttribute("data-lp-card") ?? "?");
  const boardOrder = (id: string) => [...ctx.board.cards(id)].map((card) => card.id);

  beforeEach(() => {
    ctx = setup();
    ctx.card("b").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    under = null;
    document.elementFromPoint = () => under;
    moves = [];
    ctx.board.on("move", (event) => moves.push(event));
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => drag.destroy());

  async function dragTo(target: Element | null, y: number) {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    under = target;
    pointer(ctx.card("a"), "pointermove", 60, y);
    await frame();
    pointer(ctx.card("a"), "pointerup", 60, y);
  }

  it("moves the card below another card, in the Board and the DOM", async () => {
    await dragTo(ctx.card("b"), 130);
    expect(boardOrder("todo")).toEqual(["b", "a"]);
    expect(domOrder("todo")).toEqual(["b", "a"]);
    expect(moves).toHaveLength(1);
  });

  it("moves the card to the end of another list", async () => {
    await dragTo(list("done"), 300);
    expect(boardOrder("todo")).toEqual(["b"]);
    expect(boardOrder("done")).toEqual(["a"]);
    expect(domOrder("done")).toEqual(["a"]);
    expect(moves).toEqual([
      { kind: "card", id: "a", fromListId: "todo", toListId: "done", prevId: null, nextId: null },
    ]);
  });

  it("changes nothing when dropped where it was", async () => {
    const before = ctx.root.innerHTML;
    await dragTo(ctx.card("b"), 105);
    expect(moves).toEqual([]);
    expect(ctx.root.innerHTML).toBe(before);
  });

  it("cleans up after a drop: no Clone, no Placeholder, no drag state, no drag listener", async () => {
    await dragTo(list("done"), 300);
    expect(
      document.querySelector("[data-lp-clone], [data-lp-placeholder], [data-lp-dragging]"),
    ).toBeNull();
    expect(ctx.card("a").style.display).toBe("flex");
    pointer(ctx.card("a"), "pointermove", 200, 200);
    await frame();
    expect(document.querySelector("[data-lp-clone]")).toBeNull();
  });

  it("puts the card back where it was when the Board rejects the move", async () => {
    ctx.board.removeCard("a");
    const before = ctx.root.innerHTML;
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      await dragTo(list("done"), 300);
    } catch (error) {
      errors.push(error);
    }
    window.removeEventListener("error", onError);
    expect(ctx.root.innerHTML).toBe(before);
    expect(String(errors[0])).toContain('unknown id "a"');
  });
});

describe("createDrag: drop positions and listener errors", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  let under: Element | null;
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const domOrder = (id: string) =>
    [...(ctx.root.querySelector(`[data-lp-cards="${id}"]`) as HTMLElement).children].map(
      (el) => el.getAttribute("data-lp-card") ?? "?",
    );
  const boardOrder = (id: string) => [...ctx.board.cards(id)].map((card) => card.id);

  beforeEach(() => {
    ctx = setup();
    // A third card c, and boxes: a 20–60, b 100–140, c 160–200.
    const c = document.createElement("li");
    c.setAttribute("data-lp-card", "c");
    ctx.card("b").after(c);
    ctx.board.addCard("todo", { id: "c" }, null);
    ctx.card("b").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    ctx.card("c").getBoundingClientRect = () => new DOMRect(10, 160, 200, 40);
    under = null;
    document.elementFromPoint = () => under;
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => drag.destroy());

  async function dragCard(id: string, target: Element, y: number) {
    pointer(ctx.card(id), "pointerdown", 50, 30);
    pointer(ctx.card(id), "pointermove", 70, 30);
    under = target;
    pointer(ctx.card(id), "pointermove", 60, y);
    await frame();
    pointer(ctx.card(id), "pointerup", 60, y);
  }

  it("drops into the middle and at the top of a list", async () => {
    await dragCard("a", ctx.card("c"), 170);
    expect(boardOrder("todo")).toEqual(["b", "a", "c"]);
    expect(domOrder("todo")).toEqual(["b", "a", "c"]);
    ctx.card("a").getBoundingClientRect = () => new DOMRect(10, 100, 200, 40);
    ctx.card("b").getBoundingClientRect = () => new DOMRect(10, 20, 200, 40);
    await dragCard("c", ctx.card("b"), 25);
    expect(boardOrder("todo")).toEqual(["c", "b", "a"]);
    expect(domOrder("todo")).toEqual(["c", "b", "a"]);
  });

  it("keeps the DOM in step with the Board when a listener throws after a valid move", async () => {
    ctx.board.on("move", () => {
      throw new Error("listener failed");
    });
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      await dragCard("a", ctx.card("c"), 170);
    } catch (error) {
      errors.push(error);
    }
    window.removeEventListener("error", onError);
    expect(boardOrder("todo")).toEqual(["b", "a", "c"]);
    expect(domOrder("todo")).toEqual(["b", "a", "c"]);
    expect(String(errors[0])).toContain("listener failed");
    expect(document.querySelector("[data-lp-placeholder], [data-lp-clone]")).toBeNull();
  });
});

describe("createDrag: cancel", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  let under: Element | null;
  let moves: unknown[];
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const list = (id: string) => ctx.root.querySelector(`[data-lp-cards="${id}"]`) as HTMLElement;

  beforeEach(() => {
    ctx = setup();
    under = null;
    document.elementFromPoint = () => under;
    moves = [];
    ctx.board.on("move", (event) => moves.push(event));
    drag = createDrag(ctx.root, ctx.board);
  });
  afterEach(() => {
    drag.destroy();
    vi.restoreAllMocks();
  });

  async function dragToDone() {
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    under = list("done");
    pointer(ctx.card("a"), "pointermove", 60, 300);
    await frame();
  }
  const pressEscape = () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  it.each(["Escape", "pointercancel", "destroy"])(
    "restores the DOM and moves nothing on %s",
    async (how) => {
      const before = ctx.root.innerHTML;
      const remove = vi.spyOn(document, "removeEventListener");
      await dragToDone();
      expect(list("done").querySelector("[data-lp-placeholder]")).not.toBeNull();
      if (how === "Escape") pressEscape();
      else if (how === "destroy") drag.destroy();
      else pointer(ctx.card("a"), "pointercancel", 60, 300);
      expect(ctx.root.innerHTML).toBe(before);
      expect(remove.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
      // No ghost drag afterwards: moving and releasing the still-pressed pointer does nothing.
      pointer(ctx.card("a"), "pointermove", 90, 320);
      await frame();
      expect(document.querySelector("[data-lp-clone]")).toBeNull();
      pointer(ctx.card("a"), "pointerup", 60, 300);
      expect(moves).toEqual([]);
      expect([...ctx.board.cards("todo")].map((c) => c.id)).toEqual(["a", "b"]);
    },
  );

  it("ignores other keys", async () => {
    await dragToDone();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(document.querySelector("[data-lp-clone]")).not.toBeNull();
  });

  it("listens to keydown only during a drag", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toEqual([]);
    pointer(ctx.card("a"), "pointermove", 70, 30);
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    pointer(ctx.card("a"), "pointerup", 70, 30);
    expect(remove.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
  });
});

describe("createDrag: auto-scroll", () => {
  let ctx: ReturnType<typeof setup>;
  let drag: ReturnType<typeof createDrag>;
  let scroller: HTMLElement;
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  beforeEach(() => {
    ctx = setup();
    // The "todo" list scrolls vertically: 200 px tall box, 1000 px of content.
    scroller = ctx.root.querySelector('[data-lp-cards="todo"]') as HTMLElement;
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "clientHeight", { value: 200 });
    Object.defineProperty(scroller, "scrollHeight", { value: 1000 });
    scroller.getBoundingClientRect = () => new DOMRect(0, 0, 220, 200);
    document.elementFromPoint = () => scroller;
    drag = createDrag(ctx.root, ctx.board);
    pointer(ctx.card("a"), "pointerdown", 50, 30);
    pointer(ctx.card("a"), "pointermove", 70, 30);
  });
  afterEach(() => {
    drag.destroy();
    vi.restoreAllMocks();
  });

  it("scrolls a list while the pointer is near its bottom edge, faster closer to it", async () => {
    pointer(ctx.card("a"), "pointermove", 60, 180);
    await frame();
    const slow = scroller.scrollTop;
    expect(slow).toBeGreaterThan(0);
    // It keeps scrolling with the pointer still.
    await frame();
    expect(scroller.scrollTop).toBeGreaterThan(slow);
    const at = scroller.scrollTop;
    pointer(ctx.card("a"), "pointermove", 60, 198);
    await frame();
    expect(scroller.scrollTop - at).toBeGreaterThan(slow);
  });

  it("scrolls up near the top edge, and not at all away from the edges", async () => {
    scroller.scrollTop = 300;
    pointer(ctx.card("a"), "pointermove", 60, 5);
    await frame();
    expect(scroller.scrollTop).toBeLessThan(300);
    const at = scroller.scrollTop;
    pointer(ctx.card("a"), "pointermove", 60, 100);
    await frame();
    await frame();
    expect(scroller.scrollTop).toBe(at);
  });

  it("treats the window's edge as the edge of a list cut off by it", async () => {
    // The list runs past the bottom of the window; its visible bottom is the window's.
    scroller.getBoundingClientRect = () => new DOMRect(0, 0, 220, window.innerHeight + 300);
    pointer(ctx.card("a"), "pointermove", 60, window.innerHeight - 5);
    await frame();
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it("stops asking for frames once the list cannot scroll further that way", async () => {
    // At the top already, with the pointer resting near the top edge: nothing left to scroll.
    pointer(ctx.card("a"), "pointermove", 60, 5);
    await frame();
    const raf = vi.spyOn(window, "requestAnimationFrame");
    await frame();
    expect(raf.mock.calls.length).toBeLessThanOrEqual(1);
    expect(scroller.scrollTop).toBe(0);
  });

  it("scrolls the board sideways near its right edge", async () => {
    const board = ctx.root;
    board.style.overflowX = "auto";
    Object.defineProperty(board, "clientWidth", { value: 300 });
    Object.defineProperty(board, "scrollWidth", { value: 900 });
    board.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);
    document.elementFromPoint = () => board;
    pointer(ctx.card("a"), "pointermove", 295, 100);
    await frame();
    expect(board.scrollLeft).toBeGreaterThan(0);
  });

  it("stops scrolling when the drag ends", async () => {
    pointer(ctx.card("a"), "pointermove", 60, 190);
    await frame();
    pointer(ctx.card("a"), "pointercancel", 60, 190);
    const at = scroller.scrollTop;
    await frame();
    await frame();
    expect(scroller.scrollTop).toBe(at);
  });
});
