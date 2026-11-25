// The vanilla Board demo (L5.12): one Board drawn by `mount`, styled by the skins in `home.css`, Doing
// capped at 3, a click or Enter opening a card or a list; as the React demo (`react-demo.tsx`).
// Saving the order (L5.13): `keepSaved` (`saving.ts`) loads the Board from a pretend server and
// saves each `move`; a failed save puts the server's order back. Driven by
// `e2e/react.e2e.ts` and `e2e/saving.e2e.ts`, as the React one.
import { Board } from "../packages/core/src/index.ts";
import { mount } from "../packages/vanilla/src/index.ts";
import { type Card, keepSaved, type List, server } from "./saving.ts";

const LIMIT = 3;
const board = new Board<List, Card>();
const saving = keepSaved(board);

const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const root = byId("hero-board");
const status = byId("board-status");
const failNext = byId<HTMLInputElement>("fail-next");
const log = byId<HTMLOListElement>("requests");

const counts = new Map<string, HTMLElement>();
const showCounts = () => {
  for (const [id, count] of counts) {
    const n = [...board.cards(id)].length;
    count.textContent = id === "doing" ? `${n}/${LIMIT}` : String(n);
  }
};

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
board.on("change", showCounts);

saving.onNotSaved(() => {
  status.textContent =
    "Not saved: the server answered an error, so the board is back to its order.";
});

// The panel: the requests as answered, failing the next save, resetting the data.
const STATUS: Record<number, string> = {
  200: "200 OK",
  409: "409 Conflict",
  500: "500 Server error",
};
server.onRequest(({ method, path, body, status: code }) => {
  const item = document.createElement("li");
  item.toggleAttribute("data-failed", code !== 200);
  item.textContent = `${method} ${path}${body ? ` ${JSON.stringify(body)}` : ""} → ${STATUS[code]}`;
  log.prepend(item);
  for (const old of log.querySelectorAll("li:nth-child(n + 7)")) old.remove(); // the last six
  if (code === 500) failNext.checked = false;
});
failNext.addEventListener("change", () => server.failNextSave(failNext.checked));
byId("reset").addEventListener("click", async () => {
  status.textContent = "Reset: the starting board.";
  await saving.reset();
});

// On open: the board as the server has it.
status.textContent = "Loading the board…";
await saving.open();
showCounts();
status.textContent =
  "Drag a card or a list title, or use Space and the arrows. Doing holds 3 cards; a click or Enter opens a card or a list.";

// The skin chooser changes only the board's `data-skin`: the Board and its elements stay.
const skins = document.querySelectorAll<HTMLInputElement>("input[name=skin]");
// A browser may restore the checked radio on reload: start from it.
root.dataset.skin = [...skins].find((input) => input.checked)?.value ?? "cards";
for (const input of skins) {
  input.addEventListener("change", () => {
    root.dataset.skin = input.value;
  });
}
