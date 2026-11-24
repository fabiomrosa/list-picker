// The home page's board (L4.15): one Board drawn by `mount`; its look is the board's `data-skin`
// styles in `home.css`. Not published, not covered by unit tests (`e2e/home.e2e.ts` drives it).
import { Board } from "../packages/core/src/index.ts";
import { mount } from "../packages/vanilla/src/index.ts";

type List = { id: string; title: string };
type Card = { id: string; text: string; tag: string };

const LIMIT = 3;
const board = new Board<List, Card>();
board.addList({ id: "todo", title: "To do" }, null);
board.addList({ id: "doing", title: "Doing" }, null);
board.addList({ id: "done", title: "Done" }, null);
board.addCard("todo", { id: "a", text: "Sketch the onboarding flow", tag: "design" }, null);
board.addCard("todo", { id: "b", text: "Write the release notes", tag: "docs" }, null);
board.addCard("todo", { id: "c", text: "Fix the date picker on Safari", tag: "bug" }, null);
board.addCard("doing", { id: "d", text: "Move cards with the keyboard", tag: "a11y" }, null);
board.addCard("doing", { id: "e", text: "Profile the drag on a long list", tag: "perf" }, null);
board.addCard("done", { id: "f", text: "Model lists as linked lists", tag: "core" }, null);

const counts = new Map<string, HTMLElement>();
const showCounts = () => {
  for (const [id, count] of counts) {
    const n = [...board.cards(id)].length;
    count.textContent = id === "doing" ? `${n}/${LIMIT}` : String(n);
  }
};

const root = document.getElementById("hero-board") as HTMLElement;
mount(
  root,
  board,
  {
    renderList(list) {
      const head = document.createElement("header");
      head.className = "hb-head";
      head.setAttribute("aria-label", list.title);
      const title = document.createElement("h3");
      title.textContent = list.title;
      const count = document.createElement("span");
      count.className = "hb-count";
      counts.set(list.id, count);
      head.append(title, count);
      return head;
    },
    renderCard(card) {
      const element = document.createElement("article");
      element.className = "hb-card";
      element.setAttribute("aria-label", card.text);
      const tag = document.createElement("span");
      tag.className = "hb-tag";
      tag.textContent = card.tag;
      const text = document.createElement("p");
      text.textContent = card.text;
      element.append(tag, text);
      return element;
    },
  },
  {
    canMove: ({ kind, id, toListId }) =>
      kind === "list" ||
      toListId !== "doing" ||
      board.listOf(id)?.id === "doing" ||
      [...board.cards("doing")].length < LIMIT,
  },
);
showCounts();
board.on("change", showCounts);
