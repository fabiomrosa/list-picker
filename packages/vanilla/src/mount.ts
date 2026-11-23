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

/** A mounted list's two containers: its own (`[data-lp-list]`) and its cards' (`[data-lp-cards]`). */
interface ListElements {
  readonly container: HTMLElement;
  readonly cards: HTMLElement;
}

/** The nearest previous sibling of `item` that carries `attribute`, if any. */
function previousItem(item: Element, attribute: string): Element | null {
  let previous = item.previousElementSibling;
  while (previous && !previous.hasAttribute(attribute)) previous = previous.previousElementSibling;
  return previous;
}

/**
 * Puts `items` in this order among the children of `parent` that carry `attribute`, moving only
 * the ones out of place; other children (the user's, the Clone, the Placeholder) stay put.
 */
function arrange(parent: HTMLElement, items: HTMLElement[], attribute: string): void {
  let previous: HTMLElement | null = null;
  for (const item of items) {
    if (item.parentElement !== parent || previousItem(item, attribute) !== previous) {
      const first = parent.querySelector(`:scope > [${attribute}]`);
      if (previous) previous.after(item);
      else if (first) first.before(item);
      else parent.append(item);
    }
    previous = item;
  }
}

/**
 * Draws `board` into `root` from the user's Renderers, in the markup the drag engine reads
 * (DEC-13, DEC-14): per list a `[data-lp-list]` holding its header (`[data-lp-list-handle]`) and a
 * `[data-lp-cards]` container of its cards (`[data-lp-card]`). Then it follows the Board by id: after
 * each change (once the change's own DOM writes, such as a drop's, are done) a Renderer runs only for
 * a new list or card, and kept elements are moved, never redrawn. Every Renderer runs, and its
 * result is checked, before any element is marked or moved: bad input throws and changes nothing.
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
  const lists = new Map<string, ListElements>();
  const cards = new Map<string, HTMLElement>();

  /** Brings the DOM in line with the Board's Snapshot, writing only what differs. */
  function reconcile(): void {
    const snapshot = board.snapshot().lists;
    const newLists = new Map<string, HTMLElement>();
    const newCards = new Map<string, HTMLElement>();
    for (const { list, cards: listCards } of snapshot) {
      if (!lists.has(list.id)) newLists.set(list.id, checked(renderers.renderList(list), list.id));
      for (const card of listCards) {
        if (!cards.has(card.id))
          newCards.set(card.id, checked(renderers.renderCard(card), card.id));
      }
    }

    for (const [id, header] of newLists) {
      const container = document.createElement("div");
      container.setAttribute("data-lp-list", id);
      header.setAttribute("data-lp-list-handle", "");
      const cardsContainer = document.createElement("div");
      cardsContainer.setAttribute("data-lp-cards", id);
      container.append(header, cardsContainer);
      lists.set(id, { container, cards: cardsContainer });
    }
    for (const [id, element] of newCards) {
      element.setAttribute("data-lp-card", id);
      cards.set(id, element);
    }
    const listIds = new Set(snapshot.map(({ list }) => list.id));
    const cardIds = new Set(snapshot.flatMap((entry) => entry.cards.map((card) => card.id)));
    for (const [id, { container }] of lists) {
      if (!listIds.has(id)) {
        container.remove();
        lists.delete(id);
      }
    }
    for (const [id, element] of cards) {
      if (!cardIds.has(id)) {
        element.remove();
        cards.delete(id);
      }
    }

    const elementsOf = (id: string) => lists.get(id) as ListElements;
    arrange(
      root,
      snapshot.map(({ list }) => elementsOf(list.id).container),
      "data-lp-list",
    );
    for (const { list, cards: listCards } of snapshot) {
      const elements = listCards.map((card) => cards.get(card.id) as HTMLElement);
      arrange(elementsOf(list.id).cards, elements, "data-lp-card");
    }
  }

  reconcile();
  let queued = false;
  let destroyed = false;
  // A drop changes the Board before the engine moves the element: reconcile after it, once.
  const unsubscribe = board.on("change", () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!destroyed) reconcile();
    });
  });
  const drag = createDrag(root, board);
  return {
    destroy() {
      destroyed = true;
      unsubscribe();
      drag.destroy();
      for (const { container } of lists.values()) container.remove();
    },
  };
}
