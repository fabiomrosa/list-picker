import type { Board } from "@list-picker/core";
import { createDrag } from "./drag.ts";

/** A mounted Board; `destroy()` removes what `mount` added and every listener. */
export interface Mount {
  destroy(): void;
}

/** The user's Renderers (DEC-07): each returns the element of one list's header or one card. */
export interface Renderers<L, C> {
  renderList(list: L): HTMLElement;
  renderCard(card: C): HTMLElement;
}

/** The Renderer's result for the item `id`, which must be an element. */
function rendered(element: unknown, id: string): HTMLElement {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`list-picker: the Renderer of "${id}" returned no element`);
  }
  return element;
}

/**
 * Draws `board` into `root` from the user's Renderers, in the markup the drag engine reads
 * (DEC-13, DEC-14): per list a `[data-lp-list]` holding its header (`[data-lp-list-handle]`) and a
 * `[data-lp-cards]` container of its cards (`[data-lp-card]`). Bad input throws before `root`
 * changes.
 */
export function mount<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  renderers: Renderers<L, C>,
): Mount {
  if (!(root instanceof HTMLElement)) throw new Error("list-picker: mount needs a root element");
  const added: HTMLElement[] = [];
  for (const { list, cards } of board.snapshot().lists) {
    const container = document.createElement("div");
    container.setAttribute("data-lp-list", list.id);
    const header = rendered(renderers.renderList(list), list.id);
    header.setAttribute("data-lp-list-handle", "");
    const cardsContainer = document.createElement("div");
    cardsContainer.setAttribute("data-lp-cards", list.id);
    for (const card of cards) {
      const element = rendered(renderers.renderCard(card), card.id);
      element.setAttribute("data-lp-card", card.id);
      cardsContainer.append(element);
    }
    container.append(header, cardsContainer);
    added.push(container);
  }
  root.append(...added);
  const drag = createDrag(root, board);
  return {
    destroy() {
      drag.destroy();
      for (const element of added) element.remove();
    },
  };
}
