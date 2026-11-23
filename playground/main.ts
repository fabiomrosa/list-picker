// A hand-test page for @list-picker/core (`npm run dev`). Not published, not covered.
import { LinkedList } from "../packages/core/src/index.ts";

type Item = { id: string };

const list = new LinkedList<Item>();
const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const form = byId<HTMLFormElement>("append");
const error = byId<HTMLParagraphElement>("error");
const listView = byId<HTMLDivElement>("list");
const meta = byId<HTMLParagraphElement>("meta");
const before = byId<HTMLSelectElement>("before");

function el(tag: string, className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function render(): void {
  listView.replaceChildren();
  for (const item of list) {
    const node = list.get(item.id);
    if (!node) continue;
    if (node.prev) listView.append(el("span", "link", "⇄"));
    const box = el("div", "node", "");
    box.append(
      el("strong", "", item.id),
      el("small", "", `prev: ${node.prev?.value.id ?? "null"}`),
      el("small", "", `next: ${node.next?.value.id ?? "null"}`),
    );
    const remove = el("button", "remove", "×") as HTMLButtonElement;
    remove.type = "button";
    remove.title = `remove ${item.id}`;
    remove.addEventListener("click", () => {
      list.remove(item.id);
      render();
    });
    box.append(remove);
    listView.append(box);
  }
  const selected = before.value;
  before.replaceChildren(new Option("(end)", ""));
  for (const item of list) before.append(new Option(item.id, item.id));
  before.value = list.has(selected) ? selected : "";
  meta.textContent = `size ${list.size} · first ${list.first?.value.id ?? "–"} · last ${list.last?.value.id ?? "–"}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.elements.namedItem("id") as HTMLInputElement;
  const id = input.value.trim();
  if (!id) return;
  try {
    list.insertBefore({ id }, before.value || null);
    error.textContent = "";
    input.value = "";
  } catch (e) {
    error.textContent = (e as Error).message;
  }
  render();
});

render();
