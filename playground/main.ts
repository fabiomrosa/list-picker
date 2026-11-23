// The demo board (`npm run dev`): `mount` draws the Board from the Renderers below. Not published,
// not covered.
import { Board } from "../packages/core/src/index.ts";
import { mount } from "../packages/vanilla/src/index.ts";

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

/** Runs a Board operation from the page, showing its error if it throws. */
function attempt(act: () => void): boolean {
  try {
    act();
    error.textContent = "";
    return true;
  } catch (e) {
    error.textContent = (e as Error).message;
    status.textContent = "";
    return false;
  } finally {
    refresh();
  }
}

/** A button that runs `act` when clicked; `role` lets `refresh` find it to enable or disable it. */
function action(text: string, title: string, role: string, act: () => void): HTMLButtonElement {
  const button = el("button", "action", text) as HTMLButtonElement;
  button.type = "button";
  button.title = title;
  button.dataset.role = role;
  button.addEventListener("click", () => attempt(act));
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

const listIds = () => [...board.lists()].map((list) => list.id);
const cardIds = (listId: string) => [...board.cards(listId)].map((card) => card.id);

/** Where a list or a card is now, read at click time: Renderers run once, positions change. */
function listAt(id: string) {
  const ids = listIds();
  const i = ids.indexOf(id);
  return { left: ids[i - 1], right: ids[i + 1], afterRight: ids[i + 2] ?? null };
}
function cardAt(id: string) {
  const listId = board.listOf(id)?.id as string;
  const ids = cardIds(listId);
  const i = ids.indexOf(id);
  const lists = listAt(listId);
  return { listId, up: ids[i - 1], down: ids[i + 1], afterDown: ids[i + 2] ?? null, ...lists };
}

function renderList(list: Entity): HTMLElement {
  const head = el("header", "list-head", "");
  const tools = el("div", "list-tools", "");
  tools.append(
    action("←", `move list ${list.id} left`, "left", () => {
      const { left } = listAt(list.id);
      if (left) moveList(list.id, left);
    }),
    action("→", `move list ${list.id} right`, "right", () =>
      moveList(list.id, listAt(list.id).afterRight),
    ),
    action("×", `remove list ${list.id}`, "remove", () => board.removeList(list.id)),
  );
  head.append(
    Object.assign(el("h2", "", list.id), { title: `drag to move ${list.id}` }),
    Object.assign(el("small", "", ""), { className: "count" }),
    tools,
  );
  return head;
}

function renderCard(card: Entity): HTMLElement {
  const box = el("div", "card", "");
  const tools = el("div", "tools", "");
  tools.append(
    action("↑", `move ${card.id} up`, "up", () => {
      const { listId, up } = cardAt(card.id);
      if (up) move(card.id, listId, up);
    }),
    action("↓", `move ${card.id} down`, "down", () => {
      const { listId, afterDown } = cardAt(card.id);
      move(card.id, listId, afterDown);
    }),
    action("←", `move ${card.id} left`, "left", () => {
      const { left } = cardAt(card.id);
      if (left) move(card.id, left, null);
    }),
    action("→", `move ${card.id} right`, "right", () => {
      const { right } = cardAt(card.id);
      if (right) move(card.id, right, null);
    }),
    action("×", `remove card ${card.id}`, "remove", () => board.removeCard(card.id)),
  );
  box.append(el("strong", "", card.id), el("small", "neighbours", ""), tools);
  return box;
}

/** Refills a select with "(end)" or `empty`, then `ids`, keeping the choice when it still exists. */
function fill(select: HTMLSelectElement, ids: string[], empty: string | null): void {
  const selected = select.value;
  select.replaceChildren(...(empty === null ? [] : [new Option(empty, "")]));
  for (const id of ids) select.append(new Option(id, id));
  if (ids.includes(selected) || (selected === "" && empty !== null)) select.value = selected;
}

let lastSnapshot: unknown;
let version = 0;

/**
 * Updates what depends on position (neighbours, counts, which buttons apply) and the forms; the
 * elements themselves are kept and ordered by `mount`.
 */
function refresh(): void {
  const snapshot = board.snapshot();
  if (snapshot !== lastSnapshot) {
    lastSnapshot = snapshot;
    version++;
  }
  snapshotView.textContent = `snapshot v${version}`;
  const button = (scope: Element, role: string) =>
    scope.querySelector(`[data-role="${role}"]`) as HTMLButtonElement;
  for (const head of boardView.querySelectorAll<HTMLElement>("[data-lp-list-handle]")) {
    const id = head.closest("[data-lp-list]")?.getAttribute("data-lp-list") as string;
    // Removed from the Board, not yet from the DOM: `mount` reconciles a microtask later.
    if (!board.getList(id)) continue;
    const count = cardIds(id).length;
    (head.querySelector(".count") as HTMLElement).textContent =
      `${count} ${count === 1 ? "card" : "cards"}`;
    const at = listAt(id);
    button(head, "left").disabled = !at.left;
    button(head, "right").disabled = !at.right;
  }
  for (const box of boardView.querySelectorAll<HTMLElement>("[data-lp-card]")) {
    const id = box.getAttribute("data-lp-card") as string;
    if (!board.getCard(id)) continue;
    const at = cardAt(id);
    (box.querySelector(".neighbours") as HTMLElement).textContent =
      `prev: ${at.up ?? "null"} · next: ${at.down ?? "null"}`;
    button(box, "up").disabled = !at.up;
    button(box, "down").disabled = !at.down;
    button(box, "left").disabled = !at.left;
    button(box, "right").disabled = !at.right;
  }
  const lists = listIds();
  fill(field(listForm, "before"), lists, "(end)");
  const target = field<HTMLSelectElement>(cardForm, "list");
  fill(target, lists, null);
  fill(field(cardForm, "before"), target.value ? cardIds(target.value) : [], "(end)");
  fill(field(moveForm, "card"), lists.flatMap(cardIds), null);
  const moveTo = field<HTMLSelectElement>(moveForm, "list");
  fill(moveTo, lists, null);
  fill(field(moveForm, "before"), moveTo.value ? cardIds(moveTo.value) : [], "(end)");
}

function submit(form: HTMLFormElement, act: (id: string) => void): void {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = field<HTMLInputElement>(form, "id");
    const id = input.value.trim();
    if (id && attempt(() => act(id))) input.value = "";
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
field<HTMLSelectElement>(cardForm, "list").addEventListener("change", refresh);
field<HTMLSelectElement>(moveForm, "list").addEventListener("change", refresh);
moveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const card = field<HTMLSelectElement>(moveForm, "card").value;
  if (!card) return;
  attempt(() =>
    move(
      card,
      field<HTMLSelectElement>(moveForm, "list").value,
      field<HTMLSelectElement>(moveForm, "before").value || null,
    ),
  );
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
mount(boardView, board, { renderList, renderCard });
refresh();
// After every change (a drop too), once `mount` has reconciled (its microtask runs first).
let queued = false;
board.on("change", () => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    refresh();
  });
});
