// @vitest-environment happy-dom
// The source, not the package: `core/dist` does not exist in a clean clone before the build.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
