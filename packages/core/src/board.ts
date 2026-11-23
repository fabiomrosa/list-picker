import { Emitter } from "./emitter.ts";
import { LinkedList } from "./linked-list.ts";

type Entity = { id: string };

/** What a changing move did, in neighbours rather than indexes (DEC-11). */
export interface MoveEvent {
  readonly kind: "card" | "list";
  readonly id: string;
  /** The card's List before and after the move; `null` for a list move. */
  readonly fromListId: string | null;
  readonly toListId: string | null;
  /** The new neighbours (cards, or lists for a list move); `null` at an end. */
  readonly prevId: string | null;
  readonly nextId: string | null;
}

/** `move` for persistence; `change`, with no payload, after every change, for renderers. */
export interface BoardEvents extends Record<string, unknown> {
  move: MoveEvent;
  change: undefined;
}

/** A List on the Board: the user's list value and its linked list of cards. */
interface ListEntry<L, C extends Entity> {
  readonly id: string;
  readonly list: L;
  readonly cards: LinkedList<C>;
}

/**
 * Ordered Lists of ordered Cards (DEC-06): a linked list of Lists, each holding a linked list of
 * Cards, plus a card-to-list index so any card and its List are found in O(1).
 */
export class Board<L extends Entity, C extends Entity> {
  #lists = new LinkedList<ListEntry<L, C>>();
  #listOfCard = new Map<string, ListEntry<L, C>>();
  #events = new Emitter<BoardEvents>();

  /** Subscribes to `move` or `change`; the returned function unsubscribes. */
  on<K extends keyof BoardEvents>(
    event: K,
    listener: (payload: BoardEvents[K]) => void,
  ): () => void {
    return this.#events.on(event, listener);
  }

  addList(list: L, beforeListId: string | null): void {
    this.#lists.insertBefore({ id: list.id, list, cards: new LinkedList<C>() }, beforeListId);
    this.#events.emit("change", undefined);
  }

  addCard(listId: string, card: C, beforeCardId: string | null): void {
    const entry = this.#entry(listId);
    if (this.#listOfCard.has(card.id)) {
      throw new Error(`list-picker: duplicate id "${card.id}"`);
    }
    entry.cards.insertBefore(card, beforeCardId);
    this.#listOfCard.set(card.id, entry);
    this.#events.emit("change", undefined);
  }

  /** Removes the card with `id` from its List and the Board, and returns it. */
  removeCard(id: string): C {
    const entry = this.#listOfCard.get(id);
    if (!entry) throw new Error(`list-picker: unknown id "${id}"`);
    const card = entry.cards.remove(id);
    this.#listOfCard.delete(id);
    this.#events.emit("change", undefined);
    return card;
  }

  /** Removes the List with `id` and all its cards from the Board, and returns the List. */
  removeList(id: string): L {
    const entry = this.#lists.remove(id);
    for (const card of entry.cards) this.#listOfCard.delete(card.id);
    this.#events.emit("change", undefined);
    return entry.list;
  }

  /**
   * Moves the card with `id` before `beforeCardId` in `toListId`, or to its end (`null`). Returns
   * whether the order changed. Everything is checked before the card is unlinked.
   */
  moveCard(id: string, toListId: string, beforeCardId: string | null): boolean {
    const from = this.#listOfCard.get(id);
    if (!from) throw new Error(`list-picker: unknown id "${id}"`);
    const to = this.#entry(toListId);
    if (beforeCardId !== null && !to.cards.has(beforeCardId)) {
      if (!this.#listOfCard.has(beforeCardId)) {
        throw new Error(`list-picker: unknown id "${beforeCardId}"`);
      }
      throw new Error(`list-picker: card "${beforeCardId}" is not in list "${toListId}"`);
    }
    if (from === to) {
      const next = from.cards.get(id)?.next?.value.id ?? null;
      if (beforeCardId === id || beforeCardId === next) return false;
    }
    const card = from.cards.remove(id);
    to.cards.insertBefore(card, beforeCardId);
    this.#listOfCard.set(id, to);
    this.#emitMove("card", id, from.id, to.id, to.cards);
    return true;
  }

  /**
   * Moves the List with `id` (and its cards) before `beforeListId`, or to the end (`null`).
   * Returns whether the order changed. Everything is checked before the List is unlinked.
   */
  moveList(id: string, beforeListId: string | null): boolean {
    const node = this.#lists.get(id);
    if (!node) throw new Error(`list-picker: unknown id "${id}"`);
    if (beforeListId !== null && !this.#lists.has(beforeListId)) {
      throw new Error(`list-picker: unknown id "${beforeListId}"`);
    }
    if (beforeListId === id || beforeListId === (node.next?.value.id ?? null)) return false;
    this.#lists.insertBefore(this.#lists.remove(id), beforeListId);
    this.#emitMove("list", id, null, null, this.#lists);
    return true;
  }

  getList(id: string): L | undefined {
    return this.#lists.get(id)?.value.list;
  }

  getCard(id: string): C | undefined {
    return this.#listOfCard.get(id)?.cards.get(id)?.value;
  }

  listOf(cardId: string): L | undefined {
    return this.#listOfCard.get(cardId)?.list;
  }

  *lists(): Generator<L> {
    for (const entry of this.#lists) yield entry.list;
  }

  cards(listId: string): Iterable<C> {
    return this.#entry(listId).cards;
  }

  /** Emits `move` with the node's new neighbours in `list`, then `change`. */
  #emitMove<T extends Entity>(
    kind: MoveEvent["kind"],
    id: string,
    fromListId: string | null,
    toListId: string | null,
    list: LinkedList<T>,
  ): void {
    const node = list.get(id);
    const prevId = node?.prev?.value.id ?? null;
    const nextId = node?.next?.value.id ?? null;
    try {
      this.#events.emit("move", { kind, id, fromListId, toListId, prevId, nextId });
    } finally {
      this.#events.emit("change", undefined);
    }
  }

  #entry(listId: string): ListEntry<L, C> {
    const node = this.#lists.get(listId);
    if (!node) throw new Error(`list-picker: unknown list "${listId}"`);
    return node.value;
  }
}
