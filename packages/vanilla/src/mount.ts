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

/**
 * Draws `board` into `root` from the user's Renderers, in the markup the drag engine reads
 * (DEC-13, DEC-14): per list a `[data-lp-list]` holding its header (`[data-lp-list-handle]`) and a
 * `[data-lp-cards]` container of its cards (`[data-lp-card]`). Every Renderer runs, and its result
 * is checked, before any element is marked or moved: bad input throws and changes nothing.
 */
export function mount<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  renderers: Renderers<L, C>,
): Mount {
  if (!(root instanceof HTMLElement)) throw new Error("list-picker: mount needs a root element");
  const seen = new Set<unknown>();
  /** The Renderer's result for `id`: a new element, not in the document, not given before. */
  const checked = (element: unknown, id: string): HTMLElement => {
    if (!(element instanceof HTMLElement) || element.isConnected || seen.has(element)) {
      throw new Error(`list-picker: the Renderer of "${id}" must return a new, detached element`);
    }
    seen.add(element);
    return element;
  };
  const rendered = board.snapshot().lists.map(({ list, cards }) => ({
    id: list.id,
    header: checked(renderers.renderList(list), list.id),
    cards: cards.map((card) => ({
      id: card.id,
      element: checked(renderers.renderCard(card), card.id),
    })),
  }));

  const added = rendered.map(({ id, header, cards }) => {
    const container = document.createElement("div");
    container.setAttribute("data-lp-list", id);
    header.setAttribute("data-lp-list-handle", "");
    const cardsContainer = document.createElement("div");
    cardsContainer.setAttribute("data-lp-cards", id);
    for (const card of cards) {
      card.element.setAttribute("data-lp-card", card.id);
      cardsContainer.append(card.element);
    }
    container.append(header, cardsContainer);
    return container;
  });
  root.append(...added);
  const drag = createDrag(root, board);
  return {
    destroy() {
      drag.destroy();
      for (const element of added) element.remove();
    },
  };
}
