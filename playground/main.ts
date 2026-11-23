// A hand-test page for @list-picker/core (`npm run dev`). Not published, not covered.
import { Board } from "../packages/core/src/index.ts";

type Entity = { id: string };

const board = new Board<Entity, Entity>();
const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const listForm = byId<HTMLFormElement>("add-list");
const cardForm = byId<HTMLFormElement>("add-card");
const error = byId<HTMLParagraphElement>("error");
const boardView = byId<HTMLDivElement>("board");
const field = <E extends Element>(form: HTMLFormElement, name: string) =>
  form.elements.namedItem(name) as unknown as E;

function el(tag: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function removeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el("button", "remove", "×") as HTMLButtonElement;
  button.type = "button";
  button.title = `remove ${label}`;
  button.addEventListener("click", () => {
    onClick();
    render();
  });
  return button;
}

/** Refills a select with "(end)" or `empty`, then `ids`, keeping the choice when it still exists. */
function fill(select: HTMLSelectElement, ids: string[], empty: string | null): void {
  const selected = select.value;
  select.replaceChildren(...(empty === null ? [] : [new Option(empty, "")]));
  for (const id of ids) select.append(new Option(id, id));
  if (ids.includes(selected) || selected === "") select.value = selected;
}

function render(): void {
  boardView.replaceChildren();
  const listIds = [...board.lists()].map((list) => list.id);
  for (const listId of listIds) {
    const column = el("section", "list", "");
    const cards = [...board.cards(listId)];
    column.append(
      removeButton(`list ${listId}`, () => board.removeList(listId)),
      el("h2", "", listId),
      el("small", "", `${cards.length} ${cards.length === 1 ? "card" : "cards"}`),
    );
    const stack = el("div", "cards", "");
    cards.forEach((card, i) => {
      const box = el("div", "card", "");
      box.append(
        el("strong", "", card.id),
        el(
          "small",
          "",
          `prev: ${cards[i - 1]?.id ?? "null"} · next: ${cards[i + 1]?.id ?? "null"}`,
        ),
        removeButton(`card ${card.id}`, () => board.removeCard(card.id)),
      );
      stack.append(box);
    });
    column.append(stack);
    boardView.append(column);
  }
  fill(field(listForm, "before"), listIds, "(end)");
  const target = field<HTMLSelectElement>(cardForm, "list");
  fill(target, listIds, null);
  const cardIds = target.value ? [...board.cards(target.value)].map((card) => card.id) : [];
  fill(field(cardForm, "before"), cardIds, "(end)");
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

for (const id of ["To do", "Doing", "Done"]) board.addList({ id }, null);
for (const id of ["Design the model", "Write the tests"]) board.addCard("To do", { id }, null);
board.addCard("Doing", { id: "Linked list" }, null);
render();
