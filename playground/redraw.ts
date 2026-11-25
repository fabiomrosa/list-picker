// A board drawn from the Snapshot with new elements on every change, as a framework may draw it
// (DEC-18), for the browser tests of `moveElements: false` (L5.2). `?redraw=microtask` draws after
// the change, as React does; otherwise in the change listener itself.
import { Board } from "../packages/core/src/index.ts";
import { createDrag } from "../packages/vanilla/src/index.ts";

type Entity = { id: string };
const board = new Board<Entity, Entity>();
for (const id of ["todo", "doing", "done"]) board.addList({ id }, null);
for (const id of ["a", "b", "c"]) board.addCard("todo", { id }, null);
board.addCard("doing", { id: "d" }, null);

const root = document.getElementById("board") as HTMLElement;
function draw(): void {
  root.replaceChildren(
    ...board.snapshot().lists.map(({ list, cards }) => {
      const ul = document.createElement("ul");
      ul.setAttribute("data-lp-cards", list.id);
      ul.setAttribute("aria-label", list.id);
      for (const card of cards) {
        const li = document.createElement("li");
        li.setAttribute("data-lp-card", card.id);
        li.tabIndex = 0;
        li.textContent = card.id;
        ul.append(li);
      }
      return ul;
    }),
  );
}
draw();
const microtask = new URLSearchParams(location.search).get("redraw") === "microtask";
board.on("change", () => (microtask ? queueMicrotask(draw) : draw()));
createDrag(root, board, { moveElements: false });
Object.assign(window, { board });
