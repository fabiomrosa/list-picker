import type { Board } from "@list-picker/core";
import type { DragOptions } from "./announce.ts";
import { startDrag } from "./drag.ts";

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

/** The positions in `sequence` of a longest strictly increasing run of its values that are 0 or more. */
function longestIncreasing(sequence: readonly number[]): Set<number> {
  /** `ends[k]`: the position of the smallest value ending a run of length k + 1. */
  const ends: number[] = [];
  const before = new Map<number, number>();
  sequence.forEach((value, position) => {
    if (value < 0) return;
    let low = 0;
    let high = ends.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((sequence[ends[middle] as number] as number) < value) low = middle + 1;
      else high = middle;
    }
    if (low > 0) before.set(position, ends[low - 1] as number);
    ends[low] = position;
  });
  const run = new Set<number>();
  for (let position = ends.at(-1); position !== undefined; position = before.get(position)) {
    run.add(position);
  }
  return run;
}

/**
 * Puts `items` in this order among the children of `parent` that carry `attribute`, keeping the
 * longest run already in order and moving only the rest; other children (the user's, the Clone,
 * the Placeholder) stay put.
 */
function arrange(parent: HTMLElement, items: readonly HTMLElement[], attribute: string): void {
  const current = new Map<Element, number>();
  for (const child of parent.children) {
    if (child.hasAttribute(attribute)) current.set(child, current.size);
  }
  const kept = longestIncreasing(items.map((item) => current.get(item) ?? -1));
  let previous: HTMLElement | null = null;
  for (const [position, item] of items.entries()) {
    if (!kept.has(position)) {
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
 * `[data-lp-cards]` container of its cards (`[data-lp-card]`). Then it follows the Board by id: on
 * each change a Renderer runs only for a new list or card, so its error throws from the Board
 * operation and writes nothing; the DOM writes follow once the change's own writes (a drop's) are
 * done, or once the active drag ends, and kept elements are moved, never redrawn. A drag whose card
 * or list leaves the Board is abandoned.
 */
export function mount<L extends { id: string }, C extends { id: string }>(
  root: HTMLElement,
  board: Board<L, C>,
  renderers: Renderers<L, C>,
  options: DragOptions = {},
): Mount {
  if (!(root instanceof HTMLElement)) throw new Error("list-picker: mount needs a root element");
  // Weak: a removed element is not kept alive just to refuse it if it comes back.
  const seen = new WeakSet<object>();
  /** The Renderer's result for `id`: a new element, not in the document, not given before. */
  const checked = (element: unknown, id: string): HTMLElement => {
    if (!(element instanceof HTMLElement) || element.isConnected || seen.has(element)) {
      throw new Error(`list-picker: the Renderer of "${id}" must return a new, detached element`);
    }
    seen.add(element);
    return element;
  };
  /** The Renderers' elements by id, kept as soon as rendered so none renders twice. */
  const headers = new Map<string, HTMLElement>();
  const cards = new Map<string, HTMLElement>();
  const lists = new Map<string, ListElements>();

  /**
   * Runs the Renderers for every list and card of the Board not rendered yet, checking each
   * result, before any DOM write: a Renderer error throws here and writes nothing.
   */
  function render(): void {
    for (const { list, cards: listCards } of board.snapshot().lists) {
      if (!headers.has(list.id)) headers.set(list.id, checked(renderers.renderList(list), list.id));
      for (const card of listCards) {
        if (!cards.has(card.id)) cards.set(card.id, checked(renderers.renderCard(card), card.id));
      }
    }
  }

  /** Brings the DOM in line with the Board's Snapshot, every element rendered, writing only what differs. */
  function write(): void {
    const snapshot = board.snapshot().lists;
    const listIds = new Set(snapshot.map(({ list }) => list.id));
    const cardIds = new Set(snapshot.flatMap((entry) => entry.cards.map((card) => card.id)));
    for (const id of headers.keys()) {
      if (!listIds.has(id)) {
        lists.get(id)?.container.remove();
        lists.delete(id);
        headers.delete(id);
      }
    }
    for (const [id, element] of cards) {
      if (!cardIds.has(id)) {
        element.remove();
        cards.delete(id);
      }
    }

    for (const { list, cards: listCards } of snapshot) {
      if (!lists.has(list.id)) {
        const header = headers.get(list.id) as HTMLElement;
        const container = document.createElement("div");
        container.setAttribute("data-lp-list", list.id);
        header.setAttribute("data-lp-list-handle", "");
        if (!header.hasAttribute("tabindex")) header.tabIndex = 0;
        const cardsContainer = document.createElement("div");
        cardsContainer.setAttribute("data-lp-cards", list.id);
        container.append(header, cardsContainer);
        lists.set(list.id, { container, cards: cardsContainer });
      }
      for (const card of listCards) {
        const element = cards.get(card.id) as HTMLElement;
        if (!element.hasAttribute("data-lp-card")) {
          element.setAttribute("data-lp-card", card.id);
          // Focusable, for moving with the keyboard (DEC-15).
          if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
        }
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

  render();
  write();
  let queued = false;
  /** A Renderer failed on the latest change: write nothing until a later change renders all. */
  let failed = false;
  /** A write found a drag active: it runs when the drag ends. */
  let waiting = false;
  let destroyed = false;
  // The DOM writes wait for the change's own writes (a drop's), once per tick, and for a drag's end.
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (destroyed || failed) return;
      waiting = drag.dragged() !== undefined;
      if (!waiting) write();
    });
  };
  const drag = startDrag(
    root,
    board,
    () => {
      if (waiting) schedule();
    },
    options.messages,
  );
  /**
   * Whether the active drag can still drop: its card or list, and the list its Placeholder is in,
   * are still on the Board.
   */
  const droppable = (item: HTMLElement) => {
    const card = item.getAttribute("data-lp-card");
    if (card === null) return board.getList(item.getAttribute("data-lp-list") ?? "") !== undefined;
    const into = root.querySelector("[data-lp-placeholder]")?.closest("[data-lp-cards]");
    return (
      board.getCard(card) !== undefined &&
      board.getList(into?.getAttribute("data-lp-cards") ?? "") !== undefined
    );
  };
  // The Renderers run in the listener, so their errors reach the caller of the Board operation.
  const unsubscribe = board.on("change", () => {
    const dragged = drag.dragged();
    if (dragged && !droppable(dragged)) drag.cancel();
    failed = true;
    render();
    failed = false;
    schedule();
  });
  return {
    destroy() {
      destroyed = true;
      unsubscribe();
      drag.destroy();
      for (const { container } of lists.values()) container.remove();
    },
  };
}
