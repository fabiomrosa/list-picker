// A hand-test page for @list-picker/core (`npm run dev`). Not published, not covered.
import { Board, type Snapshot } from "../packages/core/src/index.ts";
import { createDrag } from "../packages/vanilla/src/index.ts";

type Entity = { id: string };

const board = new Board<Entity, Entity>();
const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const listForm = byId<HTMLFormElement>("add-list");
const cardForm = byId<HTMLFormElement>("add-card");
const error = byId<HTMLParagraphElement>("error");
const boardView = byId<HTMLDivElement>("board");
const moveForm = byId<HTMLFormElement>("move-card");
const status = byId<HTMLParagraphElement>("status");
const snapshotView = byId<HTMLElement>("snapshot");
const field = <E extends Element>(form: HTMLFormElement, name: string) =>
  form.elements.namedItem(name) as unknown as E;

function el(tag: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function action(text: string, title: string, onClick: () => void, disabled = false) {
  const button = el("button", "action", text) as HTMLButtonElement;
  button.type = "button";
  button.disabled = disabled;
  button.title = title;
  button.addEventListener("click", () => {
    try {
      onClick();
      error.textContent = "";
    } catch (e) {
      error.textContent = (e as Error).message;
      status.textContent = "";
    }
    render();
  });
  return button;
}

/** Moves a list and says on the page whether the order changed. */
function moveList(id: string, beforeListId: string | null): void {
  const changed = board.moveList(id, beforeListId);
  status.textContent = changed
    ? `moved list ${id} before ${beforeListId ?? "(end)"}`
    : `list ${id}: same place, nothing changed`;
}

/** Moves a card and says on the page whether the order changed. */
function move(id: string, toListId: string, beforeCardId: string | null): void {
  const changed = board.moveCard(id, toListId, beforeCardId);
  status.textContent = changed
    ? `moved ${id} → ${toListId}, before ${beforeCardId ?? "(end)"}`
    : `${id}: same place, nothing changed`;
}

/** Refills a select with "(end)" or `empty`, then `ids`, keeping the choice when it still exists. */
function fill(select: HTMLSelectElement, ids: string[], empty: string | null): void {
  const selected = select.value;
  select.replaceChildren(...(empty === null ? [] : [new Option(empty, "")]));
  for (const id of ids) select.append(new Option(id, id));
  if (ids.includes(selected) || (selected === "" && empty !== null)) select.value = selected;
}

let lastSnapshot: Snapshot<Entity, Entity> | undefined;
let version = 0;

/** Draws the Board from its Snapshot, as a framework adapter would. */
function render(): void {
  boardView.replaceChildren();
  const snapshot = board.snapshot();
  if (snapshot !== lastSnapshot) {
    lastSnapshot = snapshot;
    version++;
  }
  snapshotView.textContent = `snapshot v${version}`;
  const cardsOf = new Map(snapshot.lists.map(({ list, cards }) => [list.id, cards]));
  const idsIn = (listId: string) => (cardsOf.get(listId) ?? []).map((card) => card.id);
  const listIds = snapshot.lists.map(({ list }) => list.id);
  listIds.forEach((listId, li) => {
    const column = el("section", "list", "");
    column.dataset.lpList = listId;
    const cards = cardsOf.get(listId) ?? [];
    const header = el("div", "list-tools", "");
    const left = listIds[li - 1];
    const afterNext = listIds[li + 2] ?? null;
    header.append(
      action("←", `move list ${listId} left`, () => left && moveList(listId, left), !left),
      action(
        "→",
        `move list ${listId} right`,
        () => moveList(listId, afterNext),
        li === listIds.length - 1,
      ),
      action("×", `remove list ${listId}`, () => board.removeList(listId)),
    );
    column.append(
      header,
      Object.assign(el("h2", "", listId), { title: `drag to move ${listId}` }),
      el("small", "", `${cards.length} ${cards.length === 1 ? "card" : "cards"}`),
    );
    (column.querySelector("h2") as HTMLElement).dataset.lpListHandle = "";
    const stack = el("div", "cards", "");
    stack.dataset.lpCards = listId;
    cards.forEach((card, i) => {
      const box = el("div", "card", "");
      box.dataset.lpCard = card.id;
      box.append(
        el("strong", "", card.id),
        el(
          "small",
          "",
          `prev: ${cards[i - 1]?.id ?? "null"} · next: ${cards[i + 1]?.id ?? "null"}`,
        ),
      );
      const tools = el("div", "tools", "");
      const prevList = listIds[li - 1];
      const nextList = listIds[li + 1];
      const up = cards[i - 1];
      tools.append(
        action("↑", `move ${card.id} up`, () => up && move(card.id, listId, up.id), !up),
        action(
          "↓",
          `move ${card.id} down`,
          () => move(card.id, listId, cards[i + 2]?.id ?? null),
          i === cards.length - 1,
        ),
        action(
          "←",
          `move ${card.id} left`,
          () => prevList && move(card.id, prevList, null),
          !prevList,
        ),
        action(
          "→",
          `move ${card.id} right`,
          () => nextList && move(card.id, nextList, null),
          !nextList,
        ),
        action("×", `remove card ${card.id}`, () => board.removeCard(card.id)),
      );
      box.append(tools);
      stack.append(box);
    });
    column.append(stack);
    boardView.append(column);
  });
  fill(field(listForm, "before"), listIds, "(end)");
  const target = field<HTMLSelectElement>(cardForm, "list");
  fill(target, listIds, null);
  const cardIds = idsIn(target.value);
  fill(field(cardForm, "before"), cardIds, "(end)");
  const allCards = listIds.flatMap(idsIn);
  fill(field(moveForm, "card"), allCards, null);
  const moveTo = field<HTMLSelectElement>(moveForm, "list");
  fill(moveTo, listIds, null);
  const moveBefore = idsIn(moveTo.value);
  fill(field(moveForm, "before"), moveBefore, "(end)");
}

function submit(form: HTMLFormElement, act: (id: string) => void): void {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = field<HTMLInputElement>(form, "id");
    const id = input.value.trim();
    if (!id) return;
    try {
      act(id);
      error.textContent = "";
      input.value = "";
    } catch (e) {
      error.textContent = (e as Error).message;
      status.textContent = "";
    }
    render();
  });
}

submit(listForm, (id) =>
  board.addList({ id }, field<HTMLSelectElement>(listForm, "before").value || null),
);
submit(cardForm, (id) =>
  board.addCard(
    field<HTMLSelectElement>(cardForm, "list").value,
    { id },
    field<HTMLSelectElement>(cardForm, "before").value || null,
  ),
);
field<HTMLSelectElement>(cardForm, "list").addEventListener("change", render);
field<HTMLSelectElement>(moveForm, "list").addEventListener("change", render);
moveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const card = field<HTMLSelectElement>(moveForm, "card").value;
  if (!card) return;
  try {
    move(
      card,
      field<HTMLSelectElement>(moveForm, "list").value,
      field<HTMLSelectElement>(moveForm, "before").value || null,
    );
    error.textContent = "";
  } catch (e) {
    error.textContent = (e as Error).message;
    status.textContent = "";
  }
  render();
});

const log = byId<HTMLOListElement>("log");
const changesView = byId<HTMLElement>("changes");
let changes = 0;
board.on("change", () => {
  changes++;
  changesView.textContent = `· ${changes} change events`;
});
board.on("move", (event) => {
  log.prepend(el("li", "", `move ${JSON.stringify(event)}`));
});

for (const id of ["To do", "Doing", "Done"]) board.addList({ id }, null);
for (const id of ["Design the model", "Write the tests"]) board.addCard("To do", { id }, null);
board.addCard("Doing", { id: "Linked list" }, null);
// A tall, scrolling list to try auto-scroll on.
board.addList({ id: "Backlog" }, null);
for (let i = 1; i <= 14; i++) board.addCard("Backlog", { id: `Idea ${i}` }, null);
render();
// Drops change the Board outside the buttons' handlers: redraw after every change, once the
// engine has finished (a microtask later).
let redraw = false;
board.on("change", () => {
  if (redraw) return;
  redraw = true;
  queueMicrotask(() => {
    redraw = false;
    render();
  });
});
createDrag(boardView, board);
