// The vanilla Board demo (L5.12): the home's board (`home.ts`) on its own page, as the React demo
// (`react-demo.tsx`) draws it: one Board drawn by `mount`, styled by the skins in `home.css`, Doing
// capped at 3, a click or Enter opening a card or a list. Driven by `e2e/react.e2e.ts`, as the React
// one.
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
const status = document.getElementById("board-status") as HTMLElement;
mount(
  root,
  board,
  {
    renderList(list) {
      const head = document.createElement("header");
      head.className = "hb-head";
      head.setAttribute("aria-label", list.title);
      const title = document.createElement("h3");
      title.className = "hb-title";
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
      text.className = "hb-text";
      text.textContent = card.text;
      element.append(tag, text);
      return element;
    },
  },
  {
    // Doing holds 3 cards: a fourth is never shown there, nor dropped.
    canMove: ({ kind, id, toListId }) =>
      kind === "list" ||
      toListId !== "doing" ||
      board.listOf(id)?.id === "doing" ||
      [...board.cards("doing")].length < LIMIT,
    onActivate: ({ kind, id }) => {
      const opened = kind === "card" ? board.getCard(id)?.text : board.getList(id)?.title;
      status.textContent = `Opened: ${opened}.`;
    },
  },
);
showCounts();
board.on("change", showCounts);

// The skin chooser changes only the board's `data-skin`: the Board and its elements stay.
const skins = document.querySelectorAll<HTMLInputElement>("input[name=skin]");
// A browser may restore the checked radio on reload: start from it.
root.dataset.skin = [...skins].find((input) => input.checked)?.value ?? "cards";
for (const input of skins) {
  input.addEventListener("change", () => {
    root.dataset.skin = input.value;
  });
}
