// A hand-test page for @list-picker/core (`npm run dev`). Not published, not covered.
import { LinkedList } from "../packages/core/src/index.ts";

type Item = { id: string };

const list = new LinkedList<Item>();
const byId = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const form = byId<HTMLFormElement>("append");
const error = byId<HTMLParagraphElement>("error");
const listView = byId<HTMLDivElement>("list");
const meta = byId<HTMLParagraphElement>("meta");

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
    listView.append(box);
  }
  meta.textContent = `size ${list.size} · first ${list.first?.value.id ?? "–"} · last ${list.last?.value.id ?? "–"}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.elements.namedItem("id") as HTMLInputElement;
  const id = input.value.trim();
  if (!id) return;
  try {
    list.insertBefore({ id }, null);
    error.textContent = "";
    input.value = "";
  } catch (e) {
    error.textContent = (e as Error).message;
  }
  render();
});

render();
